import { moderateText, type FlyBrain } from '../src/stream/brain.ts';
import type { FlyBrainState } from '../src/stream/types.ts';
import { boundedResponse, providerEndpoint, validReservation } from './provider.ts';
import { HttpError } from './security.ts';

const enabled = (state: FlyBrainState) => state.running && state.outputsArmed && !state.safe && !state.pausedAI && state.settings.voiceEnabled && state.settings.voiceProvider === 'server';
const speechKey = (state: FlyBrainState) => `${state.startedAt}:${state.character.speechId}`;
type AudioResult = { bytes: Buffer; contentType: string; latencyMs: number };

/** Server-only OpenAI-compatible speech adapter. It can only voice the active brain subtitle. */
export class TtsAdapter {
  private active: { controller: AbortController; key: string } | null = null;
  private cached: { key: string; result: AudioResult } | null = null;
  private nextAt = 0;
  constructor(private env: NodeJS.ProcessEnv = process.env, private request: typeof fetch = fetch) {}
  configured(): boolean {
    return this.env.TTS_ENABLED === 'true' && Boolean(this.env.TTS_API_KEY && this.env.TTS_BASE_URL && this.env.TTS_MODEL && this.env.TTS_VOICE && validReservation(this.env.TTS_MAX_REQUEST_USD));
  }
  cancel(): void { this.active?.controller.abort(); this.cached = null; }
  sync(state: FlyBrainState): void {
    if (!enabled(state) || (this.active && this.active.key !== speechKey(state)) || !state.character.subtitle) this.cancel();
    if (this.cached?.key !== speechKey(state)) this.cached = null;
  }
  async speak(brain: FlyBrain, text: unknown, onReserved: () => void = () => {}, signal?: AbortSignal): Promise<AudioResult> {
    if (!this.configured()) throw new HttpError(409, 'Server voice is unconfigured; browser voice or subtitles remain available.');
    const state = brain.snapshot();
    if (!enabled(state)) throw new HttpError(409, 'Server voice output is not armed.');
    if (typeof text !== 'string' || text !== state.character.subtitle || text.length > 180 || state.character.speechExpiresAt <= Date.now() || !moderateText(text).safe) throw new HttpError(400, 'Only the current moderated character subtitle may be synthesized.');
    const key = speechKey(state);
    if (this.cached?.key === key) return this.cached.result;
    if (this.active || Date.now() < this.nextAt) throw new HttpError(429, 'Server voice cooldown.');
    if (signal?.aborted) throw new HttpError(409, 'Voice request was interrupted.');
    const endpoint = providerEndpoint(this.env.TTS_BASE_URL!, 'audio/speech');
    const reserve = brain.command({ type: 'ai_reserve', payload: { costUsd: Number(this.env.TTS_MAX_REQUEST_USD), model: `tts:${this.env.TTS_MODEL}` } });
    if (!reserve.ok) throw new HttpError(429, 'Voice budget exhausted or character output paused.');
    onReserved();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    this.active = { controller, key };
    this.nextAt = Date.now() + 5000;
    const start = Date.now();
    const timeout = setTimeout(abort, 10_000);
    try {
      const response = await this.request(endpoint, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.env.TTS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.env.TTS_MODEL, voice: this.env.TTS_VOICE, input: text, response_format: 'mp3', speed: 1.12 }),
      });
      if (!response.ok) throw new HttpError(502, 'Voice provider unavailable; browser fallback remains available.');
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
      if (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg'].includes(contentType)) throw new HttpError(502, 'Voice provider returned an unsupported audio format.');
      const bytes = await boundedResponse(response, 2_000_000);
      const current = brain.snapshot();
      if (!bytes.length || controller.signal.aborted || !enabled(current) || speechKey(current) !== key || current.character.subtitle !== text || current.character.speechExpiresAt <= Date.now()) throw new HttpError(409, 'Voice response discarded after the character changed or output stopped.');
      const result = { bytes, contentType, latencyMs: Date.now() - start };
      this.cached = { key, result };
      return result;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      this.active = null;
    }
  }
}
