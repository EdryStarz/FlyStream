import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { byteRange, mediaMagic, trustedRequest } from '../server/security.ts';
import { decodeKickEvent, KickAdapter, WebhookVerifier } from '../server/kick.ts';

const request = (headers: Record<string, string>) => ({ headers }) as IncomingMessage;

test('local operator origin and host checks stop cross-site mutations and DNS rebinding', () => {
  const origins = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:8791']);
  assert.equal(trustedRequest(request({ host: '127.0.0.1:5173', origin: 'http://127.0.0.1:5173' }), origins, true), true);
  assert.equal(trustedRequest(request({ host: 'evil.example', origin: 'http://127.0.0.1:5173' }), origins, true), false);
  assert.equal(trustedRequest(request({ host: '127.0.0.1:5173', origin: 'https://evil.example' }), origins, true), false);
  assert.equal(trustedRequest(request({ host: '127.0.0.1:5173' }), origins, true), false);
  assert.equal(trustedRequest(request({ host: '127.0.0.1:5173' }), origins, false), true);
});

test('KICK verifies exact raw body, bounded timestamps and duplicate message IDs', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const verifier = new WebhookVerifier(publicKey.export({ type: 'spki', format: 'pem' }).toString());
  const at = Date.now();
  const body = Buffer.from('{"content":"!dance"}');
  const timestamp = new Date(at).toISOString();
  const signed = Buffer.concat([new TextEncoder().encode(`message-1.${timestamp}.`), new Uint8Array(body)]);
  const headers = { 'kick-event-message-id': 'message-1', 'kick-event-message-timestamp': timestamp, 'kick-event-signature': sign('RSA-SHA256', new Uint8Array(signed), privateKey).toString('base64') };
  assert.equal(verifier.verify(request(headers), Buffer.from('{"content":"!scare"}'), at), 'invalid');
  assert.equal(verifier.verify(request(headers), body, at), 'valid');
  assert.equal(verifier.verify(request(headers), body, at), 'duplicate');
  assert.equal(verifier.verify(request(headers), body, at + 300_001), 'invalid');
});

test('OAuth creates PKCE, rejects stale/reused state, never returns tokens in status', async () => {
  let exchanges = 0;
  let posted: URLSearchParams | undefined;
  const fetcher = (async (_url: unknown, init?: RequestInit) => {
    exchanges++;
    posted = init?.body as URLSearchParams;
    return new Response(JSON.stringify({ access_token: 'sensitive-token', refresh_token: 'sensitive-refresh', expires_in: 3600 }), { status: 200 });
  }) as typeof fetch;
  const adapter = new KickAdapter({ KICK_CLIENT_ID: 'test-id', KICK_CLIENT_SECRET: 'test-secret' }, fetcher);
  const authorization = new URL(adapter.authorization(1000));
  assert.equal(authorization.hostname, 'id.kick.com');
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(authorization.searchParams.get('scope'), 'channel:read events:subscribe');
  assert.ok(!authorization.toString().includes('test-secret'));
  const state = authorization.searchParams.get('state')!;
  await adapter.callback('test-code', state, 2000);
  assert.equal(createHash('sha256').update(posted!.get('code_verifier')!).digest('base64url'), authorization.searchParams.get('code_challenge'));
  assert.equal(JSON.stringify(adapter.status()).includes('sensitive'), false);
  await assert.rejects(adapter.callback('test-code', state, 2001), /state expired or invalid/);
  const expired = new URL(adapter.authorization(1000)).searchParams.get('state')!;
  await assert.rejects(adapter.callback('test-code', expired, 601001), /state expired or invalid/);
  assert.equal(exchanges, 1);
});

test('signed provider events are scoped to broadcaster and never invent cash revenue', () => {
  const event = { broadcaster: { user_id: 123 }, subscriber: { user_id: 7, username: '<viewer>' } };
  assert.deepEqual(decodeKickEvent('channel.subscription.new', event, 'id', '999'), []);
  const accepted = decodeKickEvent('channel.subscription.new', event, 'id', '123')[0];
  assert.equal(accepted.demo, false);
  assert.equal(accepted.name, 'viewer');
  assert.equal(accepted.amount, undefined);
  assert.deepEqual(decodeKickEvent('kicks.gifted', { ...event, gift: { amount: 500 } }, 'id', '123'), []);
});

test('media checks reject active content and range parser handles browser seeks', () => {
  assert.equal(mediaMagic(Buffer.from('<svg onload="alert(1)"></svg>'), 'image/png'), false);
  assert.deepEqual(byteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(byteRange('bytes=-20', 100), { start: 80, end: 99 });
  assert.deepEqual(byteRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.equal(byteRange('bytes=100-', 100), null);
  assert.equal(byteRange('bytes=0-9,30-40', 100), null);
});

test('no credentials is a graceful demo and outbound is explicitly disabled', async () => {
  let calls = 0;
  const adapter = new KickAdapter({}, (async () => { calls++; throw new Error('Network must stay off'); }) as typeof fetch);
  assert.equal(adapter.status().mode, 'DEMO');
  assert.throws(() => adapter.authorization(), /DEMO/);
  await assert.rejects(adapter.sendModerated('Hello', true), /disabled/);
  await assert.rejects(adapter.channel(), /BROADCASTER_ID/);
  assert.equal(calls, 0);
});

test('server-provisioned expired KICK token refreshes once and never leaks the replacement', async () => {
  let apiCalls = 0, refreshes = 0;
  const adapter = new KickAdapter({ KICK_CLIENT_ID: 'fixture-id', KICK_CLIENT_SECRET: 'fixture-secret', KICK_ACCESS_TOKEN: 'expired', KICK_REFRESH_TOKEN: 'refresh', KICK_BROADCASTER_ID: '123' }, (async (url, init) => {
    if (String(url).endsWith('/oauth/token')) {
      refreshes++;
      assert.equal((init?.body as URLSearchParams).get('grant_type'), 'refresh_token');
      return new Response(JSON.stringify({ access_token: 'renewed-private-token', refresh_token: 'rotated-private-refresh', expires_in: 3600 }));
    }
    apiCalls++;
    if (apiCalls === 1) return new Response('{}', { status: 401 });
    return new Response(JSON.stringify({ data: [{ slug: 'fixture', stream_title: 'Test channel', stream: { is_live: true, viewer_count: 12 } }] }));
  }) as typeof fetch);
  assert.equal((await adapter.channel()).viewers, 12);
  assert.equal(refreshes, 1); assert.equal(apiCalls, 2);
  assert.equal(JSON.stringify(adapter.status()).includes('private'), false);
});

test('disconnect cannot be undone by an authorization response already in flight', async () => {
  let finish!: (response: Response) => void;
  const adapter = new KickAdapter({ KICK_CLIENT_ID: 'fixture-id', KICK_CLIENT_SECRET: 'fixture-secret' }, (() => new Promise<Response>(resolve => { finish = resolve; })) as typeof fetch);
  const state = new URL(adapter.authorization()).searchParams.get('state')!;
  const pending = adapter.callback('code', state);
  adapter.disconnect();
  finish(new Response(JSON.stringify({ access_token: 'late-private-token', expires_in: 3600 })));
  await assert.rejects(pending, /interrupted/);
  assert.equal(adapter.status().tokenPresent, false);
});
