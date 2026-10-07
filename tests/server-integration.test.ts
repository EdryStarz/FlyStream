import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRuntime } from '../server/index.ts';

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }, env: NodeJS.ProcessEnv = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'flystream-server-'));
  const runtimes: ReturnType<typeof createRuntime>[] = [];
  async function start() {
    const runtime = createRuntime({ port: 0, tick: false, env, dataDir: directory });
    runtimes.push(runtime);
    const address = await runtime.listen();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    const post = (path: string, value: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    return { runtime, base, post };
  }
  t.after(async () => {
    for (const runtime of runtimes) if (runtime.server.listening) await runtime.close();
    // Delete only this test's generated temporary directory.
    assert.ok(resolve(directory).startsWith(resolve(join(tmpdir(), 'flystream-server-'))));
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, start, ...await start() };
}

test('HTTP demo runs without credentials, rejects unsafe origins and keeps provider secrets out of state', async t => {
  const { base, post } = await fixture(t, { AI_API_KEY: 'private-fixture-value', KICK_CLIENT_SECRET: 'private-fixture-kick', TTS_API_KEY: 'private-fixture-voice' });
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.kick.mode, 'DEMO');
  assert.equal(health.aiConfigured, false);
  assert.equal(health.ttsConfigured, false);
  assert.equal((await post('/api/command', { type: 'start' })).status, 200);
  assert.equal((await post('/api/command', { type: 'demo_event', payload: { type: 'subscription', userId: 'demo-a' } })).status, 200);
  const stateText = await (await fetch(`${base}/api/state`)).text();
  const state = JSON.parse(stateText);
  assert.equal(state.running, true);
  assert.equal(state.monetization.demo.subscriptions, 1);
  assert.equal(state.monetization.real.subscriptions, 0);
  assert.equal(stateText.includes('private-fixture'), false);
  for (const origin of ['', 'https://evil.example']) {
    const response = await fetch(`${base}/api/command`, { method: 'POST', headers: { ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'safe' }) });
    assert.equal(response.status, 403);
  }
  assert.equal((await post('/api/command', { type: 'ai_reserve', payload: { costUsd: 1 } })).status, 403);
  assert.equal((await post('/api/kick/connect', {})).status, 409);
  assert.equal((await post('/api/tts', { text: 'Any supplied viewer sentence' })).status, 409);
  assert.equal((await post('/api/ai/react', {})).status, 409);
  assert.equal((await post('/api/kick/webhook/extra', {})).status, 404);
});

test('SSE subscribers get shared state, safe mode clears capture and restart remains stopped', async t => {
  const { base, post, runtime, start } = await fixture(t);
  await post('/api/command', { type: 'queue_add', payload: { title: 'Authorized fixture', source: 'capture', license: 'owned', permission: true, duration: 300 } });
  const item = runtime.brain.snapshot().queue.find(item => item.source === 'capture');
  assert.ok(item);
  await post('/api/command', { type: 'queue_play', payload: { id: item.id } });
  await post('/api/command', { type: 'start' });
  const controller = new AbortController();
  const events = await fetch(`${base}/api/events`, { signal: controller.signal });
  const first = await events.body!.getReader().read();
  assert.match(new TextDecoder().decode(first.value), /"running":true/);
  controller.abort();
  const jpeg = Buffer.from([255, 216, 255, ...Array(20).fill(0)]);
  assert.equal((await fetch(`${base}/api/capture`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg) })).status, 200);
  assert.equal((await fetch(`${base}/api/capture/frame`)).status, 200);
  await post('/api/command', { type: 'safe' });
  assert.equal((await fetch(`${base}/api/capture/frame`)).status, 204);
  assert.equal((await fetch(`${base}/api/capture`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg) })).status, 409);
  await runtime.close();
  const restarted = await start();
  const state = await (await fetch(`${restarted.base}/api/state`)).json();
  assert.equal(state.running, false);
  assert.equal(state.outputsArmed, false);
  assert.equal(state.character.subtitle, '');
  assert.equal(state.safe, true);
});

test('media HTTP validates signatures and serves ranges for uploaded media', async t => {
  const { base } = await fixture(t);
  const headers = { Origin: base, 'Content-Type': 'video/webm', 'X-File-Name': 'fixture.webm' };
  assert.equal((await fetch(`${base}/api/media`, { method: 'POST', headers, body: '<html>active content</html>' })).status, 415);
  const bytes = readFileSync(new URL('../public/sample.webm', import.meta.url));
  const uploaded = await fetch(`${base}/api/media`, { method: 'POST', headers, body: new Uint8Array(bytes) });
  assert.equal(uploaded.status, 201);
  const item = await uploaded.json();
  const range = await fetch(`${base}${item.url}`, { headers: { Range: 'bytes=0-15' } });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-range'), `bytes 0-15/${bytes.length}`);
  assert.equal((await range.arrayBuffer()).byteLength, 16);
  assert.equal((await fetch(`${base}${item.url}`, { headers: { Range: 'bytes=999999999-' } })).status, 416);
});

test('verified webhook enters only its broadcaster ledger and replay stays deduplicated after restart', async t => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { base, runtime, start, directory } = await fixture(t, { KICK_BROADCASTER_ID: '123', KICK_WEBHOOK_PUBLIC_KEY: publicKey.export({ type: 'spki', format: 'pem' }).toString() });
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ broadcaster: { user_id: 123 }, subscriber: { user_id: 456, username: 'Fixture viewer' } });
  const id = 'integration-message-1';
  const signature = sign('RSA-SHA256', new TextEncoder().encode(`${id}.${timestamp}.${body}`), privateKey).toString('base64');
  const headers = { 'Kick-Event-Message-Id': id, 'Kick-Event-Message-Timestamp': timestamp, 'Kick-Event-Signature': signature, 'Kick-Event-Type': 'channel.subscription.new', 'Kick-Event-Version': '1', 'Content-Type': 'application/json' };
  const send = (url: string, raw = body) => fetch(`${url}/api/kick/webhook`, { method: 'POST', headers, body: raw });
  assert.equal((await send(base, body.replace('456', '457'))).status, 401);
  assert.equal((await send(base)).status, 200);
  assert.equal(runtime.brain.snapshot().monetization.real.subscriptions, 1);
  assert.equal((await (await send(base)).json()).duplicate, true);
  await runtime.close();
  const restarted = await start();
  assert.equal((await (await send(restarted.base)).json()).duplicate, true);
  assert.equal(restarted.runtime.brain.snapshot().monetization.real.subscriptions, 1);
  assert.equal(readFileSync(join(directory, 'state.json'), 'utf8').includes('PRIVATE KEY'), false);
});
