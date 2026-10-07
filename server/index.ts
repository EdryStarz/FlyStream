import { createReadStream, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FlyBrain, moderateText } from '../src/stream/brain.ts';
import type { FlyBrainState, FlyCommand } from '../src/stream/types.ts';
import { AiAdapter } from './ai.ts';
import { KickAdapter, decodeKickEvent } from './kick.ts';
import { StateStore } from './storage.ts';
import { TtsAdapter } from './tts.ts';
import { byteRange, cleanText, header, HttpError, json, mediaMagic, mediaTypes, RateLimiter, readBody, readJson, trustedRequest } from './security.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', ...Object.fromEntries(Object.entries(mediaTypes).map(([mime, extension]) => [`.${extension}`, mime])) };

export function canCapture(state: FlyBrainState): boolean {
  const current = state.queue.find(item => item.id === state.currentContentId);
  return Boolean(state.running && !state.safe && state.outputsArmed && current?.source === 'capture' && current.status === 'WATCHING' && current.permission && current.license !== 'unknown');
}

interface RuntimeOptions {
  dataDir?: string; port?: number; origin?: string; env?: NodeJS.ProcessEnv;
  tick?: boolean; brain?: FlyBrain; kick?: KickAdapter; ai?: AiAdapter; tts?: TtsAdapter;
}

export function createRuntime(options: RuntimeOptions = {}) {
  const env = options.env ?? process.env;
  const port = options.port ?? Number(env.PORT || 8791);
  const origin = options.origin || env.TRUSTED_ORIGIN || 'http://127.0.0.1:5173';
  const origins = new Set([new URL(origin).origin, `http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  const store = new StateStore(options.dataDir || env.DATA_DIR || join(ROOT, 'data'));
  const brain = options.brain || new FlyBrain(store.load() as Partial<FlyBrainState> | undefined);
  // A process restart must never resume external output without the operator.
  if (!options.brain) brain.command({ type: 'stop' });
  const kick = options.kick || new KickAdapter(env);
  kick.verifier.restore(store.loadReplay());
  const ai = options.ai || new AiAdapter(env);
  const tts = options.tts || new TtsAdapter(env);
  const clients = new Set<ServerResponse>();
  const limits = new RateLimiter();
  let uploadActive = false;
  let persistenceError = false;
  let capture: { buffer: Buffer; at: number; sequence: number; contentId: string } | null = null;
  let sequence = 0;
  let lastPersistAt = Date.now();
  let lastSentChatId = '';
  let outboundActive = false;
  const startedAt = Date.now();

  function log(event: string, details: Record<string, string | number | boolean> = {}) {
    try { store.log(event, details); } catch { persistenceError = true; }
  }
  function save(strict = false) {
    try { brain.pruneRetention(); store.save(brain.snapshot(), kick.verifier.records()); persistenceError = false; }
    catch { persistenceError = true; if (strict) throw new HttpError(503, 'Local persistence unavailable; event processing cannot be acknowledged.'); }
  }
  function broadcast() {
    const state = brain.snapshot();
    tts.sync(state);
    if (state.safe || !state.running || state.pausedAI || !state.outputsArmed || state.mode === 'MANUAL') { ai.cancel(); kick.cancelOutbound(); }
    if (!canCapture(state) || (capture && (Date.now() - capture.at > 3000 || capture.contentId !== state.currentContentId))) capture = null;
    const message = `data: ${JSON.stringify(state)}\n\n`;
    for (const client of clients) {
      if (client.destroyed || client.writableLength > 500_000) { client.destroy(); clients.delete(client); continue; }
      client.write(message);
    }
  }
  function integrationStatus() {
    const status = kick.status();
    brain.ingest({ type: 'integration_status', payload: { kick: status.connected ? 'CONNECTED' : status.tokenPresent ? 'DISCONNECTED' : 'DEMO', providerConfigured: ai.configured() } });
  }
  async function maybeSendChat() {
    const state = brain.snapshot();
    if (outboundActive || !kick.status().outboundEnabled || !state.running || state.safe || state.pausedAI || !state.outputsArmed) return;
    // Only brain-authored, moderated replies to real events qualify; demo never touches KICK.
    const reply = [...state.chat].reverse().find(item => item.bot && !item.demo);
    if (!reply || reply.id === lastSentChatId || Date.now() - reply.at > 15_000) return;
    lastSentChatId = reply.id;
    outboundActive = true;
    try {
      const moderated = moderateText(reply.text);
      if (moderated.safe) { await kick.sendModerated(moderated.text, true); log('kick_chat_sent'); }
      else log('kick_chat_moderation_blocked');
    }
    catch { log('kick_chat_not_sent'); }
    finally { outboundActive = false; integrationStatus(); }
  }

  async function route(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const method = req.method || 'GET';
    const pathname = url.pathname;
    // Only this exact endpoint is public through a reverse proxy. No prefix bypasses.
    if (pathname === '/api/kick/webhook' && method === 'POST') {
      if (!limits.take('webhook', 200, 1000)) throw new HttpError(429, 'Webhook rate limit.');
      if (!kick.broadcasterId) throw new HttpError(409, 'Webhook integration is not configured.');
      const raw = await readBody(req, 262_144);
      const result = await kick.verifyWebhook(req, raw);
      if (result === 'invalid') throw new HttpError(401, 'Invalid webhook signature or timestamp.');
      if (result === 'duplicate') { save(true); json(res, 200, { ok: true, duplicate: true }); return; }
      if (header(req, 'kick-event-version') !== '1') throw new HttpError(400, 'Unsupported webhook version.');
      let payload: unknown;
      try { payload = JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'Invalid event JSON.'); }
      const events = decodeKickEvent(header(req, 'kick-event-type'), payload, header(req, 'kick-event-message-id'), kick.broadcasterId);
      for (const event of events) brain.ingest(event);
      log('kick_webhook', { event: cleanText(header(req, 'kick-event-type'), 60), accepted: events.length });
      save(true); broadcast();
      json(res, 200, { ok: true, accepted: events.length });
      void maybeSendChat();
      return;
    }
    if (pathname === '/api/kick/callback' && method === 'GET') {
      // The single-use random state protects the callback; credentials remain in server memory.
      const expectedHost = new URL(kick.redirectUri).host;
      if (header(req, 'host') !== expectedHost) throw new HttpError(403, 'OAuth callback host mismatch.');
      await kick.callback(url.searchParams.get('code') || '', url.searchParams.get('state') || '');
      integrationStatus(); broadcast();
      res.writeHead(303, { Location: `${new URL(origin).origin}/control?kick=connected`, 'Cache-Control': 'no-store' });
      res.end(); return;
    }
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (!trustedRequest(req, origins, mutation)) throw new HttpError(403, 'Untrusted host or origin. Use the local operator URL.');
    const requestOrigin = header(req, 'origin');
    if (requestOrigin && origins.has(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-File-Name', 'Access-Control-Max-Age': '600' }); res.end(); return;
    }
    if (mutation && !limits.take('operator', 300, 60_000)) throw new HttpError(429, 'Operator command rate limit.');

    if (pathname === '/api/state' && method === 'GET') { json(res, 200, brain.snapshot()); return; }
    if (pathname === '/api/health' && method === 'GET') {
      json(res, 200, { ok: !persistenceError, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), memoryMb: Math.round(process.memoryUsage().rss / 1048576), clients: clients.size, persistence: persistenceError ? 'DEGRADED' : 'READY', capture: Boolean(capture), ...brain.snapshot().health, kick: kick.status(), aiConfigured: ai.configured(), ttsConfigured: tts.configured() }); return;
    }
    if (pathname === '/api/events' && method === 'GET') {
      if (clients.size >= 20) throw new HttpError(429, 'Too many state subscribers.');
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(`retry: 2000\ndata: ${JSON.stringify(brain.snapshot())}\n\n`);
      clients.add(res);
      res.on('close', () => clients.delete(res));
      return;
    }
    if (pathname === '/api/command' && method === 'POST') {
      const command = await readJson(req);
      if (typeof command.type !== 'string' || command.type.length > 60 || (command.payload !== undefined && (!command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload)))) throw new HttpError(400, 'Command needs type and an optional payload object.');
      // Provider billing and real money events may only enter through their own adapters.
      if (['ai_reserve', 'ai_response', 'integration_status'].includes(command.type)) throw new HttpError(403, 'Internal adapter command.');
      const result = brain.command(command as unknown as FlyCommand);
      if (result.state.safe || !result.state.running || result.state.pausedAI) ai.cancel();
      log('operator_command', { type: command.type, ok: result.ok });
      save(); broadcast();
      json(res, result.ok ? 200 : 400, result); return;
    }
    if (pathname === '/api/media' && method === 'POST') {
      if (uploadActive) throw new HttpError(429, 'One media upload may run at a time.');
      const type = header(req, 'content-type').split(';')[0];
      const extension = mediaTypes[type];
      if (!extension) throw new HttpError(415, 'Supported media: MP4, WebM, Ogg, JPEG, PNG, GIF or WebP.');
      uploadActive = true;
      try {
        const files = readdirSync(store.directory).filter(name => /^media-[a-f0-9-]+\.[a-z0-9]+$/.test(name));
        const used = files.reduce((sum, name) => sum + statSync(join(store.directory, name)).size, 0);
        if (files.length >= 100 || used >= 1_000_000_000) throw new HttpError(507, 'Local media quota reached (100 files / 1 GB).');
        const bytes = await readBody(req, Math.min(100_000_000, 1_000_000_000 - used));
        if (!mediaMagic(bytes, type)) throw new HttpError(415, 'File signature does not match the media type.');
        const id = `media-${randomUUID()}.${extension}`;
        writeFileSync(join(store.directory, id), new Uint8Array(bytes), { flag: 'wx', mode: 0o600 });
        const name = cleanText(header(req, 'x-file-name').replace(/[/\\]/g, '_'), 150) || `Local ${extension}`;
        log('media_uploaded', { bytes: bytes.length, type });
        json(res, 201, { id, url: `/api/media/${id}`, name, type });
      } finally { uploadActive = false; }
      return;
    }
    if (/^\/api\/media\/media-[a-f0-9-]{36}\.(mp4|webm|ogv|jpg|png|gif|webp)$/.test(pathname) && ['GET', 'HEAD'].includes(method)) {
      serveFile(req, res, join(store.directory, pathname.split('/').pop()!)); return;
    }
    if (pathname === '/api/capture' && method === 'POST') {
      if (!canCapture(brain.snapshot())) throw new HttpError(409, 'Select a permitted capture queue item and start the stream first.');
      if (!limits.take('capture', 3, 1000)) throw new HttpError(429, 'Capture rate limited to 3 frames/second.');
      if (header(req, 'content-type').split(';')[0] !== 'image/jpeg') throw new HttpError(415, 'Capture frames must be JPEG.');
      const bytes = await readBody(req, 500_000);
      if (!mediaMagic(bytes, 'image/jpeg')) throw new HttpError(415, 'Invalid JPEG signature.');
      const state = brain.snapshot();
      if (!canCapture(state)) throw new HttpError(409, 'Capture permission changed during upload.');
      capture = { buffer: bytes, at: Date.now(), sequence: ++sequence, contentId: state.currentContentId! };
      json(res, 200, { sequence, at: capture.at }); return;
    }
    if (pathname === '/api/capture/frame' && method === 'GET') {
      if (!capture || !canCapture(brain.snapshot()) || Date.now() - capture.at > 3000 || capture.contentId !== brain.snapshot().currentContentId) { capture = null; res.writeHead(204, { 'Cache-Control': 'no-store' }); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'Content-Length': capture.buffer.length, 'X-Frame-Sequence': capture.sequence, 'X-Capture-At': capture.at });
      res.end(capture.buffer); return;
    }
    if (pathname === '/api/kick/status' && method === 'GET') { json(res, 200, kick.status()); return; }
    if (pathname === '/api/kick/connect' && method === 'POST') { json(res, 200, { url: kick.authorization() }); return; }
    if (pathname === '/api/kick/subscribe' && method === 'POST') { const result = await kick.subscribe(); integrationStatus(); broadcast(); json(res, 200, result); return; }
    if (pathname === '/api/kick/channel' && method === 'GET') {
      if (!limits.take('channel', 2, 60_000)) throw new HttpError(429, 'Channel lookup cooldown.');
      const channel = await kick.channel();
      brain.ingest({ type: 'platform_status', demo: false, payload: channel });
      integrationStatus(); broadcast(); json(res, 200, channel); return;
    }
    if (pathname === '/api/kick/disconnect' && method === 'POST') { kick.disconnect(); integrationStatus(); broadcast(); json(res, 200, { ok: true, message: 'Disconnected locally. Revoke app authorization in KICK account settings to revoke upstream access.' }); return; }
    if (pathname === '/api/ai/react' && method === 'POST') {
      try { json(res, 200, await ai.react(brain, () => save(true))); }
      finally { save(); broadcast(); }
      return;
    }
    if (pathname === '/api/tts' && method === 'POST') {
      if (!limits.take('tts', 30, 60_000)) throw new HttpError(429, 'Voice request rate limit.');
      const body = await readJson(req, 2048);
      const controller = new AbortController();
      const cancel = () => { if (!res.writableEnded) controller.abort(); };
      res.once('close', cancel);
      try {
        const audio = await tts.speak(brain, body.text, () => save(true), controller.signal);
        if (!res.destroyed) {
          res.writeHead(200, { 'Content-Type': audio.contentType, 'Content-Length': audio.bytes.length, 'Cache-Control': 'no-store', 'X-TTS-Latency-Ms': audio.latencyMs });
          res.end(audio.bytes);
        }
      } finally { res.off('close', cancel); save(); broadcast(); }
      return;
    }
    if (pathname.startsWith('/api/')) throw new HttpError(404, 'Unknown API route.');
    if (!['GET', 'HEAD'].includes(method)) throw new HttpError(405, 'Method not allowed.');
    const base = join(ROOT, 'dist');
    let decoded: string;
    try { decoded = decodeURIComponent(pathname); } catch { throw new HttpError(400, 'Invalid path.'); }
    const path = resolve(base, `.${decoded}`);
    if ((path !== base && !path.startsWith(`${base}${sep}`)) || decoded.includes('\\') || decoded.includes('\0')) throw new HttpError(403, 'Invalid file path.');
    if (existsSync(path) && statSync(path).isFile()) { serveFile(req, res, path); return; }
    if (['/', '/control', '/stream', '/debug', '/science'].includes(pathname) && existsSync(join(base, 'index.html'))) { serveFile(req, res, join(base, 'index.html')); return; }
    throw new HttpError(404, 'File not found. Build the app or use the Vite development URL.');
  }

  const server = createServer((req, res) => {
    void route(req, res).catch(error => {
      const status = error instanceof HttpError ? error.status : 500;
      log('request_failed', { status });
      if (!res.headersSent) json(res, status, { ok: false, message: error instanceof HttpError ? error.message : 'Request failed. Local reactions continue.' });
      else res.end();
    });
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  server.maxConnections = 40;
  integrationStatus();
  const timer = options.tick === false ? null : setInterval(() => {
    try {
      brain.tick();
      broadcast();
      void ai.maybeReact(brain, () => save(true)).then(used => { if (used) { save(); broadcast(); } }).catch(() => { log('ai_provider_failed_local_fallback'); save(); broadcast(); });
      if (Date.now() - lastPersistAt > 15_000) { save(); lastPersistAt = Date.now(); }
    } catch { brain.command({ type: 'safe' }); log('tick_failed_safe_mode'); broadcast(); }
  }, 1000);
  timer?.unref();
  return {
    server, brain, kick,
    async listen() {
      await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.off('error', reject); done(); }); });
      const address = server.address();
      if (address && typeof address !== 'string') { origins.add(`http://127.0.0.1:${address.port}`); origins.add(`http://localhost:${address.port}`); }
      log('server_started');
      return server.address();
    },
    async close() {
      if (timer) clearInterval(timer);
      ai.cancel(); tts.cancel(); kick.cancelOutbound(); capture = null;
      for (const client of clients) client.end();
      save();
      server.closeAllConnections();
      await new Promise<void>(done => server.close(() => done()));
    },
  };
}

function serveFile(req: IncomingMessage, res: ServerResponse, path: string) {
  if (!existsSync(path) || !statSync(path).isFile()) throw new HttpError(404, 'Media not found.');
  const size = statSync(path).size;
  const headers: Record<string, string | number> = { 'Content-Type': MIME[extname(path)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  const range = header(req, 'range');
  let start = 0, end = size - 1;
  if (range) {
    const parsed = byteRange(range, size);
    if (!parsed) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` }); res.end(); return; }
    ({ start, end } = parsed);
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = size ? end - start + 1 : 0;
  res.writeHead(range ? 206 : 200, headers);
  if (req.method === 'HEAD' || !size) { res.end(); return; }
  const stream = createReadStream(path, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

/** Small dependency-free .env reader. Process variables always win; never exposed to Vite. */
function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || process.env[match[1]] !== undefined) continue;
      const raw = match[2];
      process.env[match[1]] = /^(['"]).*\1$/.test(raw) ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, '');
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  loadEnv();
  const runtime = createRuntime();
  runtime.listen().then(() => console.log(`FlyStream brain listening on http://127.0.0.1:${process.env.PORT || 8791} (local operator only)`)).catch(() => { console.error('FlyStream could not bind local server. Check the port and configuration.'); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void runtime.close().finally(() => process.exit(0)); });
}
