import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { createInitialState, FlyBrain } from '../src/stream/brain.ts';
import { AiAdapter, AI_INTERVAL_MS } from '../server/ai.ts';
import { TtsAdapter } from '../server/tts.ts';
import { KickAdapter, KICK_PUBLIC_KEY_URL } from '../server/kick.ts';
import { retainedState } from '../server/storage.ts';

const aiEnv = { AI_ENABLED: 'true', AI_API_KEY: 'fixture-ai-secret', AI_BASE_URL: 'https://provider.example/v1', AI_MODEL: 'fixture-model', AI_MAX_REQUEST_USD: '.001' };
const ttsEnv = { TTS_ENABLED: 'true', TTS_API_KEY: 'fixture-voice-secret', TTS_BASE_URL: 'https://provider.example/v1', TTS_MODEL: 'fixture-voice', TTS_VOICE: 'fixture', TTS_MAX_REQUEST_USD: '.001' };
function brainAt(now = Date.now(), spent = 0, event = 'event-1') {
  const state = createInitialState(now);
  state.settings.aiMaxHour = 1; state.settings.aiMaxDay = 10;
  state.costs.hourUsd = spent; state.costs.providerConfigured = true;
  state.events = [{ id: event, at: now, type: 'visual_event', summary: 'Local motion peak', demo: true, confidence: .9, novelty: .8, importance: .8 }];
  const brain = new FlyBrain(state);
  brain.ingest({ type: 'integration_status', payload: { providerConfigured: true } }, now);
  brain.command({ type: 'start' }, now);
  brain.command({ type: 'pause_ai', payload: { paused: true } }, now);
  brain.command({ type: 'pause_ai', payload: { paused: false } }, now);
  return brain;
}

test('automatic AI reacts only to interesting events at full/economy/sparse intervals', async () => {
  for (const [tier, spent] of [['full', 0], ['economy', .75], ['sparse', .95]] as const) {
    let calls = 0;
    const bodies: string[] = [];
    const adapter = new AiAdapter(aiEnv, (async (_url, init) => {
      calls++; bodies.push(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Монитор опять шевелит фотонами.' } }] }));
    }) as typeof fetch);
    const now = Date.now();
    const first = brainAt(now, spent);
    assert.equal(first.snapshot().costs.tier, tier);
    assert.equal(await adapter.maybeReact(first, undefined, now), true);
    assert.equal(first.snapshot().costs.requests, 1);
    assert.equal(await adapter.maybeReact(brainAt(now + AI_INTERVAL_MS[tier] - 1, spent, 'event-2'), undefined, now + AI_INTERVAL_MS[tier] - 1), false);
    assert.equal(await adapter.maybeReact(brainAt(now + AI_INTERVAL_MS[tier], spent, 'event-3'), undefined, now + AI_INTERVAL_MS[tier]), true);
    assert.equal(calls, 2);
    assert.equal(bodies.some(body => /fixture-ai-secret|username|userId|chat_received/.test(body)), false);
  }
});

test('AI disabled/budget exhausted makes no request and late interrupted response stays discarded', async () => {
  let calls = 0;
  const offline = new AiAdapter({}, (async () => { calls++; throw new Error('must not request'); }) as typeof fetch);
  assert.equal(await offline.maybeReact(brainAt()), false);
  const capped = brainAt(); capped.command({ type: 'settings', payload: { aiMaxHour: 0 } });
  const disabled = new AiAdapter(aiEnv, (async () => { calls++; throw new Error('must not request'); }) as typeof fetch);
  assert.equal((await disabled.react(capped)).ok, false);
  assert.equal(calls, 0);
  let finish!: (response: Response) => void;
  const adapter = new AiAdapter(aiEnv, (() => new Promise<Response>(resolve => { finish = resolve; })) as typeof fetch);
  const brain = brainAt();
  const pending = adapter.react(brain);
  brain.command({ type: 'safe' }); adapter.cancel(); brain.command({ type: 'resume' });
  finish(new Response(JSON.stringify({ choices: [{ message: { content: 'This stale line must not return.' } }] })));
  assert.equal((await pending).ok, false);
  assert.equal(brain.snapshot().actions.some(action => action.event === 'ai_response'), false);
  assert.equal(brain.snapshot().costs.requests, 1, 'reservation remains charged after cancellation');
});

test('TTS voices only the active authored line, reserves budget once and never exposes credentials', async () => {
  let calls = 0;
  const adapter = new TtsAdapter(ttsEnv, (async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://provider.example/v1/audio/speech');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.input, brain.snapshot().character.subtitle);
    assert.equal(body.response_format, 'mp3');
    assert.equal(String(init?.body).includes('fixture-voice-secret'), false);
    return new Response(new Uint8Array([73, 68, 51, 0, 1]), { headers: { 'Content-Type': 'audio/mpeg' } });
  }) as typeof fetch);
  const brain = new FlyBrain();
  brain.command({ type: 'settings', payload: { voiceProvider: 'server' } });
  brain.command({ type: 'start' });
  await assert.rejects(adapter.speak(brain, 'An arbitrary viewer message'), /current moderated/);
  assert.equal(calls, 0);
  const text = brain.snapshot().character.subtitle;
  const result = await adapter.speak(brain, text);
  assert.equal(result.contentType, 'audio/mpeg');
  assert.equal(result.bytes.length, 5);
  assert.equal((await adapter.speak(brain, text)).bytes, result.bytes);
  assert.equal(calls, 1);
  assert.equal(brain.snapshot().costs.requests, 1);
  brain.command({ type: 'safe' }); adapter.sync(brain.snapshot());
  await assert.rejects(adapter.speak(brain, text), /not armed/);
});

test('TTS rejects oversized payloads and late audio after a safety interruption', async () => {
  const makeBrain = () => { const brain = new FlyBrain(); brain.command({ type: 'settings', payload: { voiceProvider: 'server' } }); brain.command({ type: 'start' }); return brain; };
  const oversized = new TtsAdapter(ttsEnv, (async () => new Response(new Uint8Array(2_000_001), { headers: { 'Content-Type': 'audio/mpeg' } })) as typeof fetch);
  const brain = makeBrain();
  await assert.rejects(oversized.speak(brain, brain.snapshot().character.subtitle), /exceeded limit/);
  let finish!: (response: Response) => void;
  const adapter = new TtsAdapter(ttsEnv, (() => new Promise<Response>(resolve => { finish = resolve; })) as typeof fetch);
  const fresh = makeBrain();
  const pending = adapter.speak(fresh, fresh.snapshot().character.subtitle);
  fresh.command({ type: 'safe' }); adapter.sync(fresh.snapshot()); fresh.command({ type: 'resume' });
  finish(new Response(new Uint8Array([73, 68, 51]), { headers: { 'Content-Type': 'audio/mpeg' } }));
  await assert.rejects(pending, /discarded/);
});

test('KICK fetches the official signing key once, caches it, and fails closed on unavailable key', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let calls = 0;
  const adapter = new KickAdapter({ KICK_BROADCASTER_ID: '123' }, (async (url, init) => {
    calls++; assert.equal(url, KICK_PUBLIC_KEY_URL); assert.equal(init?.redirect, 'error');
    return new Response(JSON.stringify({ data: { public_key: publicKey.export({ type: 'spki', format: 'pem' }).toString() } }));
  }) as typeof fetch);
  const timestamp = new Date().toISOString(); const body = Buffer.from('{}');
  const headers = { 'kick-event-message-id': 'key-test', 'kick-event-message-timestamp': timestamp, 'kick-event-signature': sign('RSA-SHA256', new TextEncoder().encode(`key-test.${timestamp}.{}`), privateKey).toString('base64') };
  assert.equal(await adapter.verifyWebhook({ headers } as unknown as IncomingMessage, body), 'valid');
  assert.equal(await adapter.verifyWebhook({ headers } as unknown as IncomingMessage, body), 'duplicate');
  assert.equal(calls, 1);
  const failed = new KickAdapter({}, (async () => new Response('', { status: 503 })) as typeof fetch);
  await assert.rejects(failed.verifyWebhook({ headers } as unknown as IncomingMessage, body), /key is temporarily unavailable/);
});

test('persisted KICK cache drops old identities and real text without discarding ledger totals', () => {
  const now = Date.now(); const state = createInitialState(now);
  state.chat = [{ id: 'old', at: now - 86_400_001, userId: 'user-1', name: 'Viewer', text: 'Old text', demo: false, bot: false }];
  state.memory.viewers = [{ userId: 'user-1', name: 'Viewer', messages: 1, commands: 0, score: 0, subscriber: true, lastSeenAt: now - 86_400_001 }];
  state.monetization.real.subscriptions = 1;
  state.monetization.supporters = [{ userId: 'user-1', name: 'Viewer', demo: false, kind: 'subscription' }];
  const retained = retainedState(state, now) as typeof state;
  assert.equal(retained.chat.length, 0); assert.equal(retained.memory.viewers.length, 0);
  assert.equal(retained.monetization.supporters.length, 0); assert.equal(retained.monetization.real.subscriptions, 1);
});
