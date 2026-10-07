import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { BrainEvent } from '../src/stream/types.ts';
import { cleanText, header, HttpError } from './security.ts';
import { boundedResponse } from './provider.ts';

// The official guide requires fetching this key: KICK may rotate it at any time.
export const KICK_PUBLIC_KEY_URL = 'https://api.kick.com/public/v1/public-key';

export class WebhookVerifier {
  private seen = new Map<string, number>();
  constructor(private publicKey = '') {}
  setPublicKey(value: string): void {
    const key = createPublicKey(value);
    if (!value.startsWith('-----BEGIN PUBLIC KEY-----') || key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength || 0) < 2048) throw new Error('Invalid webhook key.');
    this.publicKey = value;
  }
  restore(entries: unknown, now = Date.now()): void {
    if (!Array.isArray(entries)) return;
    for (const item of entries.slice(0, 20_000)) if (Array.isArray(item) && /^[a-zA-Z0-9_-]{1,128}$/.test(item[0]) && Number.isFinite(item[1]) && item[1] > now && item[1] <= now + 600_000) this.seen.set(item[0], item[1]);
  }
  records(now = Date.now()): [string, number][] {
    for (const [key, expires] of this.seen) if (expires < now) this.seen.delete(key);
    return [...this.seen];
  }
  verify(req: IncomingMessage, body: Buffer, now = Date.now()): 'valid' | 'duplicate' | 'invalid' {
    const id = header(req, 'kick-event-message-id');
    const timestamp = header(req, 'kick-event-message-timestamp');
    const signature = header(req, 'kick-event-signature');
    const at = Date.parse(timestamp);
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || !Number.isFinite(at) || Math.abs(now - at) > 300_000 || !/^[a-zA-Z0-9+/]+=*$/.test(signature)) return 'invalid';
    try {
      const message = Buffer.concat([new TextEncoder().encode(`${id}.${timestamp}.`), new Uint8Array(body)]);
      if (!verify('RSA-SHA256', new Uint8Array(message), this.publicKey, new Uint8Array(Buffer.from(signature, 'base64')))) return 'invalid';
    } catch { return 'invalid'; }
    for (const [key, expires] of this.seen) if (expires < now) this.seen.delete(key);
    if (this.seen.has(id)) return 'duplicate';
    // Bound replay memory; fail closed under pressure rather than dropping live keys.
    if (this.seen.size >= 20_000) return 'invalid';
    this.seen.set(id, now + 600_000);
    return 'valid';
  }
}

type JsonRecord = Record<string, unknown>;
const object = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
function actor(value: unknown) {
  const data = object(value);
  return { userId: data.is_anonymous ? 'anonymous' : cleanText(data.user_id, 60), name: data.is_anonymous ? 'Anonymous' : cleanText(data.username, 60) || 'Viewer' };
}

/** Monetary notifications are counts only. KICKs are never misrepresented as USD tips. */
export function decodeKickEvent(type: string, payload: unknown, id: string, broadcasterId: string): BrainEvent[] {
  const data = object(payload);
  if (!broadcasterId || String(object(data.broadcaster).user_id) !== broadcasterId) return [];
  const base = { demo: false, id: `kick:${id}` };
  if (type === 'chat.message.sent' && typeof data.content === 'string') return [{ ...base, type: 'chat', ...actor(data.sender), text: cleanText(data.content, 500) }];
  if (type === 'channel.followed') return [{ ...base, type: 'follow', ...actor(data.follower) }];
  if (type === 'channel.subscription.new' || type === 'channel.subscription.renewal') return [{ ...base, type: 'subscription', ...actor(data.subscriber) }];
  if (type === 'channel.subscription.gifts') return (Array.isArray(data.giftees) ? data.giftees : []).slice(0, 100).map((person, index) => ({ ...base, id: `${base.id}:${index}`, type: 'subscription', ...actor(person) }));
  if (type === 'moderation.banned') return [{ ...base, type: 'moderation', ...actor(data.banned_user), payload: { action: 'ban' } }];
  if (type === 'livestream.status.updated') return [{ ...base, type: 'platform_status', payload: { live: data.is_live === true, title: cleanText(data.title, 120) } }];
  return [];
}

const EVENTS = ['chat.message.sent', 'channel.followed', 'channel.subscription.new', 'channel.subscription.renewal', 'channel.subscription.gifts', 'moderation.banned', 'livestream.status.updated'];

export class KickAdapter {
  private token: string;
  private refreshToken: string;
  private expiresAt = 0;
  private pending = new Map<string, { verifier: string; expiresAt: number }>();
  private lastSend = 0;
  private blockedUntil = 0;
  private lastText = '';
  private refreshing: Promise<void> | null = null;
  private lastError = '';
  private connected = false;
  private generation = 0;
  private keyFetchedAt = 0;
  private keyAttemptAt = 0;
  private keyLoading: Promise<void> | null = null;
  private outbound: AbortController | null = null;
  readonly verifier: WebhookVerifier;
  readonly broadcasterId: string;
  readonly redirectUri: string;
  constructor(private env: NodeJS.ProcessEnv = process.env, private request: typeof fetch = fetch) {
    this.token = env.KICK_ACCESS_TOKEN ?? '';
    this.refreshToken = env.KICK_REFRESH_TOKEN ?? '';
    this.broadcasterId = /^\d+$/.test(env.KICK_BROADCASTER_ID ?? '') ? env.KICK_BROADCASTER_ID! : '';
    this.redirectUri = env.KICK_REDIRECT_URI || 'http://127.0.0.1:8791/api/kick/callback';
    this.verifier = new WebhookVerifier(env.KICK_WEBHOOK_PUBLIC_KEY?.replace(/\\n/g, '\n') || '');
  }
  async verifyWebhook(req: IncomingMessage, body: Buffer): Promise<'valid' | 'duplicate' | 'invalid'> {
    const timestamp = Date.parse(header(req, 'kick-event-message-timestamp'));
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 300_000 || !/^[a-zA-Z0-9_-]{1,128}$/.test(header(req, 'kick-event-message-id')) || !/^[a-zA-Z0-9+/]{100,1024}={0,2}$/.test(header(req, 'kick-event-signature'))) return 'invalid';
    if (this.env.KICK_WEBHOOK_PUBLIC_KEY) return this.verifier.verify(req, body);
    if (!this.keyFetchedAt || Date.now() - this.keyFetchedAt > 3_600_000) await this.fetchPublicKey();
    let result = this.verifier.verify(req, body);
    if (result === 'invalid' && Date.now() - this.keyAttemptAt >= 60_000) {
      await this.fetchPublicKey();
      result = this.verifier.verify(req, body);
    }
    return result;
  }
  private async fetchPublicKey(): Promise<void> {
    if (this.keyLoading) return this.keyLoading;
    if (Date.now() - this.keyAttemptAt < 60_000) throw new HttpError(503, 'KICK verification key is temporarily unavailable.');
    this.keyAttemptAt = Date.now();
    this.keyLoading = (async () => {
      try {
        const response = await this.request(KICK_PUBLIC_KEY_URL, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error('key unavailable');
        const text = (await boundedResponse(response, 16_384)).toString('utf8').trim();
        const key = text.startsWith('-----BEGIN PUBLIC KEY-----') ? text : object(object(JSON.parse(text)).data).public_key;
        if (typeof key !== 'string') throw new Error('key missing');
        this.verifier.setPublicKey(key);
        this.keyFetchedAt = Date.now();
      } catch { throw new HttpError(503, 'KICK verification key is temporarily unavailable.'); }
      finally { this.keyLoading = null; }
    })();
    return this.keyLoading;
  }
  status() {
    return { mode: this.token ? 'LIVE_CONFIGURED' : 'DEMO', connected: this.connected, configured: Boolean(this.env.KICK_CLIENT_ID && this.env.KICK_CLIENT_SECRET), tokenPresent: Boolean(this.token), broadcasterConfigured: Boolean(this.broadcasterId), outboundEnabled: this.env.KICK_ENABLE_OUTBOUND === 'true', scopes: this.scopes(), lastError: this.lastError };
  }
  private scopes() { return ['channel:read', 'events:subscribe', ...(this.env.KICK_ENABLE_OUTBOUND === 'true' ? ['chat:write'] : [])]; }
  authorization(now = Date.now()): string {
    if (!this.env.KICK_CLIENT_ID || !this.env.KICK_CLIENT_SECRET) throw new HttpError(409, 'DEMO mode: add server-side KICK_CLIENT_ID and KICK_CLIENT_SECRET first.');
    const callback = new URL(this.redirectUri);
    if (callback.username || callback.password || callback.hash || (callback.protocol !== 'https:' && !(callback.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(callback.hostname)))) throw new HttpError(500, 'OAuth redirect must use HTTPS or loopback without URL credentials.');
    for (const [key, value] of this.pending) if (value.expiresAt < now) this.pending.delete(key);
    if (this.pending.size >= 5) throw new HttpError(429, 'Too many pending OAuth requests.');
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    this.pending.set(state, { verifier, expiresAt: now + 600_000 });
    const url = new URL('https://id.kick.com/oauth/authorize');
    url.searchParams.set('client_id', this.env.KICK_CLIENT_ID);
    url.searchParams.set('response_type', 'code');
    // Documented KICK local redirect workaround: preserve the exact registered URI.
    if (callback.hostname === '127.0.0.1') url.searchParams.set('redirect', '127.0.0.1');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', this.scopes().join(' '));
    url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }
  async callback(code: string, state: string, now = Date.now()): Promise<void> {
    const pending = this.pending.get(state);
    this.pending.delete(state);
    if (!pending || pending.expiresAt < now || !code || code.length > 2048) throw new HttpError(400, 'OAuth state expired or invalid. Restart Connect KICK.');
    await this.exchange({ grant_type: 'authorization_code', code, code_verifier: pending.verifier, redirect_uri: this.redirectUri });
    this.connected = true;
  }
  private async exchange(fields: Record<string, string>): Promise<void> {
    const generation = this.generation;
    const response = await this.request('https://id.kick.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...fields, client_id: this.env.KICK_CLIENT_ID || '', client_secret: this.env.KICK_CLIENT_SECRET || '' }), signal: AbortSignal.timeout(10_000), redirect: 'error' });
    if (!response.ok) throw new HttpError(502, `KICK authorization failed (${response.status}).`);
    const data = object(JSON.parse((await boundedResponse(response, 32_768)).toString('utf8')));
    if (generation !== this.generation) throw new HttpError(409, 'KICK authorization was interrupted by disconnect.');
    if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 16_384) throw new HttpError(502, 'KICK returned an invalid token response.');
    this.token = data.access_token;
    if (typeof data.refresh_token === 'string') this.refreshToken = data.refresh_token;
    this.expiresAt = Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000;
    this.lastError = '';
  }
  private async api(path: string, init: RequestInit = {}, retried = false): Promise<JsonRecord> {
    if (!this.token) throw new HttpError(409, 'KICK is in DEMO mode. Connect an authorized account first.');
    if (Date.now() < this.blockedUntil) throw new HttpError(429, 'KICK asked the adapter to back off.');
    if (this.expiresAt && Date.now() > this.expiresAt - 60_000 && this.refreshToken) {
      if (!this.refreshing) this.refreshing = this.exchange({ grant_type: 'refresh_token', refresh_token: this.refreshToken }).finally(() => { this.refreshing = null; });
      await this.refreshing;
    }
    if (init.signal?.aborted) throw new HttpError(409, 'KICK output was interrupted.');
    const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000);
    const response = await this.request(`https://api.kick.com/public/v1/${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` }, signal, redirect: 'error' });
    if (response.status === 401 && !retried && this.refreshToken && this.env.KICK_CLIENT_ID && this.env.KICK_CLIENT_SECRET) {
      await response.body?.cancel();
      if (!this.refreshing) this.refreshing = this.exchange({ grant_type: 'refresh_token', refresh_token: this.refreshToken }).finally(() => { this.refreshing = null; });
      await this.refreshing;
      return this.api(path, init, true);
    }
    if (!response.ok) {
      if (response.status === 429) this.blockedUntil = Date.now() + Math.min(3600, Math.max(30, Number(response.headers.get('retry-after')) || 60)) * 1000;
      this.lastError = `KICK API ${response.status}`;
      if (response.status === 401 || response.status === 403) this.connected = false;
      throw new HttpError(502, this.lastError);
    }
    this.connected = true;
    this.lastError = '';
    return object(JSON.parse((await boundedResponse(response, 262_144)).toString('utf8')));
  }
  async subscribe(): Promise<{ subscribed: number }> {
    if (!this.broadcasterId) throw new HttpError(409, 'Set KICK_BROADCASTER_ID before subscribing.');
    const existing = await this.api(`events/subscriptions?broadcaster_user_id=${this.broadcasterId}`);
    const have = new Set((Array.isArray(existing.data) ? existing.data : []).filter(item => String(object(item).broadcaster_user_id) === this.broadcasterId && Number(object(item).version) === 1).map(item => String(object(item).event)));
    const missing = EVENTS.filter(name => !have.has(name));
    if (!missing.length) return { subscribed: 0 };
    const result = await this.api('events/subscriptions', { method: 'POST', body: JSON.stringify({ broadcaster_user_id: Number(this.broadcasterId), events: missing.map(name => ({ name, version: 1 })), method: 'webhook' }) });
    const outcomes = Array.isArray(result.data) ? result.data : [];
    if (outcomes.some(item => object(item).error)) throw new HttpError(502, 'Some KICK event subscriptions were rejected. Check app permissions and delivery settings.');
    return { subscribed: outcomes.filter(item => typeof object(item).subscription_id === 'string').length };
  }
  async channel(): Promise<JsonRecord> {
    if (!this.broadcasterId) throw new HttpError(409, 'Set KICK_BROADCASTER_ID to read channel data.');
    const result = await this.api(`channels?broadcaster_user_id=${this.broadcasterId}`);
    const data = object(Array.isArray(result.data) ? result.data[0] : undefined);
    const stream = object(data.stream);
    // Deliberately no email, stream key, raw account or token data in the public result.
    return { slug: cleanText(data.slug, 100), title: cleanText(data.stream_title, 120), live: stream.is_live === true, viewers: Number.isFinite(Number(stream.viewer_count)) ? Number(stream.viewer_count) : null };
  }
  async sendModerated(text: string, enabled: boolean): Promise<void> {
    if (!enabled || this.env.KICK_ENABLE_OUTBOUND !== 'true') throw new HttpError(409, 'Outbound KICK chat is disabled.');
    const content = cleanText(text, 400);
    if (!content || Buffer.byteLength(content) > 1600 || content === this.lastText || Date.now() - this.lastSend < 15_000) throw new HttpError(429, 'Outbound message cooldown or duplicate.');
    this.lastSend = Date.now();
    const controller = new AbortController(); this.outbound = controller;
    try {
      await this.api('chat', { method: 'POST', body: JSON.stringify({ type: 'bot', content }), signal: controller.signal });
      this.lastText = content;
    } finally { this.outbound = null; }
  }
  cancelOutbound(): void { this.outbound?.abort(); }
  disconnect(): void {
    this.generation++;
    this.cancelOutbound();
    this.token = ''; this.refreshToken = ''; this.connected = false; this.pending.clear();
  }
}
