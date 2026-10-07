import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FlyBrainState } from '../src/stream/types.ts';

/** KICK data is a short-lived cache. Removing a user also removes derived associations. */
export function retainedState(input: unknown, now = Date.now()): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const state = structuredClone(input) as Partial<FlyBrainState>;
  const cutoff = now - 86_400_000;
  if (Array.isArray(state.chat)) state.chat = state.chat.filter(item => item?.demo || item?.at > cutoff);
  if (Array.isArray(state.events)) state.events = state.events.filter(item => item?.demo || item?.at > cutoff);
  if (state.memory && Array.isArray(state.memory.viewers)) state.memory.viewers = state.memory.viewers.filter(item => item?.lastSeenAt > cutoff);
  // These records have no source timestamp; retain only local demo supporters on disk.
  if (state.monetization && Array.isArray(state.monetization.supporters)) state.monetization.supporters = state.monetization.supporters.filter(item => item?.demo);
  state.poll = null; state.game = null;
  return state;
}

// No credentials, HTTP headers, raw webhook payloads, or request URLs enter this store.
export class StateStore {
  private path: string;
  private logPath: string;
  constructor(public directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.path = join(directory, 'state.json');
    this.logPath = join(directory, 'runtime.ndjson');
  }
  load(): unknown {
    try {
      if (!existsSync(this.path) || statSync(this.path).size > 4_000_000) return undefined;
      const data = JSON.parse(readFileSync(this.path, 'utf8'));
      if (data.version !== 1 || Date.now() - data.savedAt > 30 * 86_400_000) return undefined;
      return retainedState(data.state);
    } catch { return undefined; }
  }
  loadReplay(): unknown {
    try {
      if (!existsSync(this.path) || statSync(this.path).size > 4_000_000) return [];
      return JSON.parse(readFileSync(this.path, 'utf8')).replay;
    } catch { return []; }
  }
  save(state: unknown, replay: [string, number][] = []): void {
    const data = JSON.stringify({ version: 1, savedAt: Date.now(), state: retainedState(state), replay });
    if (Buffer.byteLength(data) > 4_000_000) throw new Error('State persistence limit reached.');
    writeFileSync(`${this.path}.tmp`, data, { mode: 0o600 });
    renameSync(`${this.path}.tmp`, this.path);
  }
  log(event: string, details: Record<string, string | number | boolean> = {}): void {
    if (existsSync(this.logPath) && statSync(this.logPath).size > 512_000) renameSync(this.logPath, `${this.logPath}.1`);
    const safeDetails = Object.fromEntries(Object.entries(details).slice(0, 12).map(([key, value]) => [key.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40), typeof value === 'string' ? value.replace(/[\r\n]/g, ' ').slice(0, 100) : value]));
    appendFileSync(this.logPath, `${JSON.stringify({ at: new Date().toISOString(), event: event.slice(0, 60), ...safeDetails })}\n`, { mode: 0o600 });
  }
}
