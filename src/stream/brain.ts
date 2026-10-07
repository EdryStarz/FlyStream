import type { BrainEvent, ChatMessage, ClipMarker, CommandResult, ContentDirectorReport, ContentItem, ContentLicense, ContentSource, FlyActionType, FlyBrainState, FlyCommand, FlyMood, FlyMode, FlySettings, MoneyLedger, Rarity, ViewerMemory } from './types';

export const BRAIN_LIMITS = { events: 160, actions: 100, chat: 80, viewers: 200, clips: 100, queue: 40, dedup: 512, participants: 200 } as const;
const MOODS: FlyMood[] = ['CURIOUS', 'BORED', 'EXCITED', 'CONFUSED', 'ANNOYED', 'SCARED', 'HUNGRY', 'OVERSTIMULATED', 'SLEEPY', 'CHAOTIC'];
const ACTIONS: FlyActionType[] = ['SAY', 'LOOK_AT', 'MOVE', 'FLY', 'LAND', 'SHAKE', 'DANCE', 'EAT', 'SLEEP', 'ZOOM_CAMERA', 'CHANGE_SCENE', 'SHOW_OVERLAY', 'RESPOND_CHAT', 'CREATE_POLL', 'CHANGE_VIDEO', 'PAUSE_VIDEO', 'REPLAY', 'SAVE_CLIP_MARKER', 'IGNORE', 'WAIT'];
const RARITY_GAP: Record<Rarity, number> = { COMMON: 25_000, UNCOMMON: 120_000, RARE: 900_000, LEGENDARY: 3_600_000 };
const clone = <T>(value: T): T => structuredClone(value);
const num = (value: unknown, fallback = 0, min = 0, max = 1e9) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const cleanText = (value: unknown, limit = 180): string => typeof value === 'string' ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
/** A local conservative gate, not a claim of comprehensive semantic moderation. Chat is never read aloud. */
export function moderateText(value: unknown): { safe: boolean; text: string; reason: string } {
  const text = cleanText(value, 280);
  const normalized = text.toLocaleLowerCase().replace(/[013@$]/g, c => ({ '0': 'o', '1': 'i', '3': 'e', '@': 'a', '$': 's' })[c]!);
  const blocked = /(?:https?:|www\.|javascript:|data:|<script|ignore.{0,30}(?:instructions|rules)|system prompt|инструкци.{0,20}игнор|игнорируй.{0,20}инструкц|kill yourself|kys\b|suicid|self.?harm|how to.{0,30}(?:bomb|kill|poison)|(?:make|build).{0,20}bomb|rape|porn|nude|naked|sex(?:ual)?\b|n[i1]gg|fagg|heil|hitler|убей|убить|суицид|самоубий|взорв|взрывчат|порно|секс|изнасил|нацист|хохл|чурк|пидор|бля|хуй|пизд|fuck|shit)/iu.test(normalized);
  return { safe: !!text && !blocked, text, reason: !text ? 'empty' : blocked ? 'moderation' : '' };
}
const safeLabel = (value: unknown, fallback: string, length = 80) => { const text = cleanText(value, length); return moderateText(text).safe ? text : fallback; };
const safeUserId = (value: unknown) => cleanText(value, 80).replace(/[^\p{L}\p{N}_:.-]/gu, '') || 'demo-operator';
const moneyLedger = (): MoneyLedger => ({ tips: 0, tipCount: 0, subscriptions: 0, follows: 0, currencies: {} });
const sample = (): ContentItem => ({ id: 'sample-loop', title: 'Own motion study · DEMO', source: 'sample', url: '/sample.webm', duration: 45, license: 'owned', permission: true, attribution: 'FlyStream Lab · authored synthetic stimulus', tags: ['grating'], category: 'experiment', viewerRequested: false, status: 'UP_NEXT', reactions: 0, moments: [] });
const synthetic = (id: string, title: string, pattern: string): ContentItem => ({ ...sample(), id, title, source: 'synthetic', url: undefined, duration: 40, tags: [pattern], status: 'UP_NEXT' });

/** Restore known primitive fields only. Arrays and nullable values need their own validators. */
function restoreObject<T extends object>(defaults: T, value: unknown): T {
  const saved = record(value); const output = clone(defaults) as Record<string, unknown>;
  for (const [key, fallback] of Object.entries(defaults)) {
    const candidate = saved[key];
    if (typeof fallback === 'number') output[key] = num(candidate, fallback, 0, Number.MAX_SAFE_INTEGER);
    else if (typeof fallback === 'string' && typeof candidate === 'string') output[key] = cleanText(candidate, 2000);
    else if (typeof fallback === 'boolean' && typeof candidate === 'boolean') output[key] = candidate;
    else if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) output[key] = restoreObject(fallback, candidate);
  }
  return output as T;
}
function restoreRows<T extends object>(value: unknown, template: T, limit: number, required: string[]): T[] {
  return (Array.isArray(value) ? value : []).slice(-limit).filter(row => required.every(key => typeof record(row)[key] === 'string')).map(row => restoreObject(template, row));
}
function restoreCounters(value: unknown, limit = 80): Record<string, number> {
  return Object.fromEntries(Object.entries(record(value)).filter(([key, amount]) => /^[a-zA-Z0-9_]{1,60}$/.test(key) && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0).slice(0, limit).map(([key, amount]) => [key, num(amount, 0, 0, Number.MAX_SAFE_INTEGER)]));
}

export function createInitialState(now = Date.now()): FlyBrainState {
  return {
    version: 1, revision: 0, updatedAt: now, startedAt: null, mode: 'AUTOPILOT', running: false, safe: false, pausedAI: false, outputsArmed: false,
    character: { name: 'M0XA', displayName: 'Мокса', mood: 'CURIOUS', action: 'LOOK_AT', subtitle: '', speechId: 0, speechExpiresAt: 0, energy: 82, hunger: 24, lore: 'Живёт под клавишей Escape. Считает монитор окном, а курсор — недоеденным фотоном.', recurringJoke: 'Шесть лап. Ни одной свободной.' },
    queue: [sample(), synthetic('synthetic-loom', 'Looming disc · DEMO', 'loom'), synthetic('synthetic-motion', 'Light patrol · DEMO', 'grating')], currentContentId: null,
    events: [], actions: [], chat: [], memory: { viewers: [], session: ['M0XA moved under the Escape key. Fictional character memory.'], lifetimeActions: 0, bestReactionMs: null }, poll: null, game: null, clips: [],
    analytics: { counters: {}, demoCounters: {}, realCounters: {}, startedAt: now, runningSeconds: 0, messagesAccepted: 0, messagesBlocked: 0, uniqueParticipants: 0, fps: null, processingMs: null, viewerCount: null },
    monetization: { demo: moneyLedger(), real: moneyLedger(), currency: 'USD', goal: { title: 'NEW FLY HABITAT', target: 100, demoProgress: 0, realProgress: 0, unlock: 'night-room' }, supporters: [] },
    sponsor: { enabled: false, title: 'Laboratory sponsor', url: '', disclosure: 'ADVERTISEMENT · РЕКЛАМА', startsAt: 0, endsAt: 0, intervalSeconds: 900, durationSeconds: 15, maxPerHour: 4, impressions: 0, clicks: 0, lastShownAt: 0, visibleUntil: 0, hourStartedAt: now, shownThisHour: 0 },
    cosmetics: { body: 'graphite', hat: 'none', room: 'lab' },
    settings: { volume: .65, voiceEnabled: true, voiceProvider: 'browser', speechCooldownSeconds: 12, commandCooldownSeconds: 4, directorIntervalSeconds: 32, minTipAmount: 1, tipCooldownSeconds: 15, aiMaxHour: .5, aiMaxDay: 3, profanityFilter: true, scienceUntil: 0, camera: 'desk' },
    costs: { hourUsd: 0, dayUsd: 0, totalUsd: 0, hourStartedAt: now, dayStartedAt: now, tier: 'local', requests: 0, blocked: 0, lastModel: 'local-rules', lastLatencyMs: 0, providerConfigured: false },
    health: { status: 'DEMO', kick: 'DEMO', ai: 'LOCAL', tts: 'BROWSER', lastError: '', lastTickAt: now, platformLive: null, platformTitle: '' },
    signals: { source: 'MODELLED', at: 0, motion: 0, change: 0, luminance: 0, on: 0, off: 0, confidence: 0, novelty: 0 },
    director: { seed: 0x4d305841, nextAt: now + 18_000, lastRarityAt: { COMMON: 0, UNCOMMON: 0, RARE: now, LEGENDARY: now }, lastEvent: '', eventCount: 0 },
  };
}

/** Editorial recommendations from bounded observed records, with no invented audience outcomes. */
export function deriveContentDirector(state: FlyBrainState): ContentDirectorReport {
  const realChat = state.chat.filter(row => !row.demo && !row.bot);
  const demoChat = state.chat.filter(row => row.demo && !row.bot);
  const markerCounts = new Map<string, number>();
  for (const clip of state.clips) if (clip.contentId) markerCounts.set(clip.contentId, (markerCounts.get(clip.contentId) ?? 0) + 1);
  const content = state.queue.filter(item => item.permission && ['owned', 'public-domain', 'cc', 'licensed'].includes(item.license) && (item.license !== 'cc' || !!item.attribution.trim()) && item.source !== 'capture')
    .map((item, index) => ({ item, index, markers: markerCounts.get(item.id) ?? 0 }))
    .sort((a, b) => b.markers - a.markers || b.item.reactions - a.item.reactions || a.index - b.index)[0];
  const realVotes = state.analytics.realCounters.poll_vote ?? 0;
  const realAttempts = state.analytics.realCounters.game_attempt ?? 0;
  const activityOpen = state.poll?.status === 'OPEN' || !!state.game && state.game.status !== 'FINISHED';
  const bestClip = [...state.clips].sort((a, b) => b.score - a.score || a.at - b.at)[0];
  return {
    sample: { retainedRealChat: realChat.length, retainedDemoChat: demoChat.length, retainedRealParticipants: new Set(realChat.map(row => row.userId)).size, retainedClipMarkers: state.clips.length, recordedRealVotes: realVotes, recordedRealGameAttempts: realAttempts },
    suggestions: [
      { id: 'content', order: 1, title: content ? `Revisit ${content.item.title}` : 'Add a cleared short segment', durationSeconds: content ? Math.min(180, content.item.duration) : 60,
        reason: content ? `${content.markers} retained clip markers and ${content.item.reactions} character actions are associated with this segment. This ranks editorial interest, not audience retention.` : 'No eligible segment is available. Add content with asserted broadcast permission and attribution before scheduling it.',
        command: content ? { type: 'queue_play', payload: { id: content.item.id } } : null, evidence: content && content.markers > 0 ? 'OBSERVED' : 'INSUFFICIENT_DATA' },
      { id: 'participation', order: 2, title: activityOpen ? 'Let the current activity finish' : realAttempts >= 3 ? 'Run one reaction round' : 'Ask the chat to choose the next experiment', durationSeconds: 45,
        reason: `${realChat.length} real messages remain in the chat sample; ${realVotes} real votes and ${realAttempts} real game attempts were recorded in this runtime. ${activityOpen ? 'Avoid overlapping audience prompts.' : realChat.length ? 'Try one bounded activity, then compare actual participation.' : 'There is not enough real chat evidence yet; use one low-pressure invitation.'}`,
        command: activityOpen ? null : realAttempts >= 3 ? { type: 'game_start', payload: { type: 'reaction' } } : { type: 'poll_create', payload: { question: 'What should M0XA investigate?', options: ['More photons', 'A quiet crumb'], duration: 30 } }, evidence: realChat.length > 0 || realAttempts > 0 || realVotes > 0 ? 'OBSERVED' : 'INSUFFICIENT_DATA' },
      { id: 'clips', order: 3, title: bestClip ? `Review candidate: ${bestClip.title}` : 'Observe one complete segment for a clip candidate', durationSeconds: 60,
        reason: bestClip ? `The highest local candidate score is ${bestClip.score}/100 (${bestClip.demo ? 'DEMO' : 'real integration event'}). It is a metadata marker, not an exported video or proof of shareability.` : 'No clip markers have been observed. Mark a concrete moment after it happens; do not invent a highlight.', command: null, evidence: bestClip ? 'OBSERVED' : 'INSUFFICIENT_DATA' },
    ],
    unavailable: { retention: null, averageWatchTime: null, returningViewers: null, revenuePerViewer: null, subscriptionRevenue: null },
    caveat: 'Deterministic editorial suggestions only. Chat and clip samples are bounded; DEMO activity is separate. Viewer watch sessions, payout reports and attribution are not connected.',
  };
}

/** Server-owned deterministic state machine. No fetch, filesystem, timers, TTS or DOM side effects. */
export class FlyBrain {
  private state: FlyBrainState;
  private sequence = 0;
  private lastSpeechAt = -Infinity;
  private actionUntil = 0;
  private lastVisualAt = -Infinity;
  private lastMetricsAt = -Infinity;
  private lastTipReactionAt = -Infinity;
  private lastClipAt = -Infinity;
  private lastGlobalCommandAt = -Infinity;
  private dedup = new Map<string, number>();
  private chatTimes = new Map<string, number>();
  private commandTimes = new Map<string, number>();
  private visualKinds = new Map<string, number>();

  constructor(initial?: Partial<FlyBrainState>) {
    const base = createInitialState(num(initial?.updatedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER));
    this.state = base;
    if (initial) {
      // Persistence is data, never permission to resume broadcasting or replay timed output.
      const saved = record(initial);
      for (const key of ['character', 'memory', 'analytics', 'monetization', 'sponsor', 'cosmetics', 'settings', 'costs', 'director'] as const) Object.assign(base[key], restoreObject(base[key], saved[key]));
      base.mode = ['MANUAL', 'ASSISTED', 'AUTOPILOT'].includes(String(saved.mode)) ? saved.mode as FlyMode : 'AUTOPILOT';
      base.safe = saved.safe === true; base.pausedAI = saved.pausedAI === true || base.safe;
      base.revision = num(saved.revision); this.sequence = base.revision * 10;
      base.character.name = 'M0XA'; base.character.displayName = 'Мокса'; base.character.subtitle = ''; base.character.speechExpiresAt = 0; base.character.speechId++; base.character.action = 'LOOK_AT';
      if (!MOODS.includes(base.character.mood)) base.character.mood = 'CURIOUS';
      base.character.energy = num(base.character.energy, 82, 0, 100); base.character.hunger = num(base.character.hunger, 24, 0, 100);
      const queue = Array.isArray(saved.queue) ? saved.queue : base.queue;
      base.queue = [sample()];
      for (const row of queue.slice(0, BRAIN_LIMITS.queue)) {
        const p = record(row); const id = cleanText(p.id, 80); if (!id || base.queue.some(item => item.id === id)) continue;
        const item = this.parseContent(p, base.updatedAt); if (!item) continue;
        item.id = id; item.reactions = num(p.reactions); item.moments = (Array.isArray(p.moments) ? p.moments : []).filter(n => typeof n === 'number' && Number.isFinite(n) && n >= 0).slice(-40);
        base.queue.push(item); if (base.queue.length >= BRAIN_LIMITS.queue) break;
      }
      const memory = record(saved.memory); const analytics = record(saved.analytics); const monetization = record(saved.monetization);
      base.memory.viewers = restoreRows(memory.viewers, { userId: '', name: 'Viewer', messages: 0, commands: 0, score: 0, subscriber: false, lastSeenAt: 0 }, BRAIN_LIMITS.viewers, ['userId', 'name']);
      base.memory.session = (Array.isArray(memory.session) ? memory.session : base.memory.session).filter(text => typeof text === 'string').slice(-24).map(text => cleanText(text, 220));
      base.memory.bestReactionMs = typeof memory.bestReactionMs === 'number' ? num(memory.bestReactionMs) : null;
      for (const key of ['counters', 'demoCounters', 'realCounters'] as const) base.analytics[key] = restoreCounters(analytics[key]);
      base.analytics.uniqueParticipants = base.memory.viewers.length;
      base.monetization.currency = /^[A-Z]{3}$/.test(base.monetization.currency) ? base.monetization.currency : 'USD';
      for (const key of ['demo', 'real'] as const) base.monetization[key].currencies = Object.fromEntries(Object.entries(restoreCounters(record(monetization[key]).currencies, 32)).filter(([currency]) => /^[A-Z]{3}$/.test(currency)));
      base.monetization.supporters = restoreRows(monetization.supporters, { userId: '', name: 'Supporter', demo: true, kind: 'tip' as const }, 40, ['userId', 'name']).filter(row => row.kind === 'tip' || row.kind === 'subscription');
      base.events = restoreRows(saved.events, { id: '', at: 0, type: '', summary: '', demo: true, confidence: 1, novelty: 0, importance: 0, userId: '' }, BRAIN_LIMITS.events, ['id', 'type', 'summary']);
      base.actions = restoreRows(saved.actions, { id: '', at: 0, event: '', mood: 'CURIOUS' as FlyMood, action: 'WAIT' as FlyActionType, reason: '', confidence: 1, model: 'local-rules', latencyMs: 0, costUsd: 0 }, BRAIN_LIMITS.actions, ['id', 'event', 'reason']).filter(row => MOODS.includes(row.mood) && ACTIONS.includes(row.action));
      base.chat = restoreRows(saved.chat, { id: '', at: 0, userId: '', name: 'Viewer', text: '', demo: true, bot: false }, BRAIN_LIMITS.chat, ['id', 'userId', 'text']).filter(row => moderateText(row.text).safe);
      base.clips = restoreRows(saved.clips, { id: '', at: 0, title: '', context: '', subtitle: '', contentId: '', score: 0, preSeconds: 20, postSeconds: 25, startAt: 0, endAt: 0, status: 'MARKER_ONLY' as const, reason: '', demo: true }, BRAIN_LIMITS.clips, ['id', 'title']).map(row => ({ ...row, contentId: row.contentId || null, status: 'MARKER_ONLY' }));
      base.costs.providerConfigured = false; base.costs.tier = 'local';
      base.sponsor.visibleUntil = 0; base.sponsor.disclosure = 'ADVERTISEMENT · РЕКЛАМА';
      this.configure({ ...record(saved.settings), sponsor: { ...base.sponsor, url: this.mediaUrl(base.sponsor.url) ? base.sponsor.url : '', enabled: base.sponsor.enabled && this.mediaUrl(base.sponsor.url) } }, base.updatedAt);
      if (!['browser', 'mock', 'server'].includes(base.settings.voiceProvider)) base.settings.voiceProvider = 'browser';
      if (!['desk', 'close', 'wide'].includes(base.settings.camera)) base.settings.camera = 'desk';
      if (!['graphite', 'amber', 'mint'].includes(base.cosmetics.body)) base.cosmetics.body = 'graphite';
      if (!['none', 'lab', 'crown'].includes(base.cosmetics.hat)) base.cosmetics.hat = 'none';
      if (!['lab', 'night'].includes(base.cosmetics.room)) base.cosmetics.room = 'lab';
      if (base.safe) this.enterSafe(base.updatedAt);
      this.bound();
    }
    if (!this.current() && !base.safe) this.playNext(base.updatedAt);
  }

  snapshot(): FlyBrainState { return clone(this.state); }

  /** Kick content retention cap; aggregate ledgers contain no message text or viewer identifiers. */
  pruneRetention(now = Date.now()): void {
    now = this.clock(now); const before = now - 86_400_000; const s = this.state;
    for (const viewer of [...s.memory.viewers]) if (viewer.lastSeenAt <= before) this.deleteUser(viewer.userId);
    s.chat = s.chat.filter(row => row.demo || row.at > before);
    s.events = s.events.filter(row => row.demo || row.at > before);
    this.bump(now);
  }

  command(command: FlyCommand, now = Date.now()): CommandResult {
    now = this.clock(now);
    if (!command || typeof command.type !== 'string') return this.result(false, 'Invalid command.');
    const p = record(command.payload); const s = this.state;
    const blockedInSafe = ['start', 'next', 'queue_play', 'mood', 'action', 'game_start', 'game_vote', 'poll_create', 'poll_vote', 'demo_event', 'chat', 'ai_reserve'];
    if (s.safe && blockedInSafe.includes(command.type)) return this.result(false, 'SAFE MODE: explicit resume is required.');
    switch (command.type) {
      case 'start':
        s.running = true; s.outputsArmed = true; s.startedAt = now; s.director.nextAt = now + 12_000;
        if (!this.current() || this.current()?.status !== 'WATCHING') this.playNext(now);
        else this.current()!.startedAt = now;
        this.act('LOOK_AT', 'CURIOUS', 'Operator explicitly started character runtime', 'stream_started', now, 'Мокса на месте. Монитор под наблюдением.');
        this.event('stream_started', 'Stream runtime started', now); break;
      case 'stop':
        s.running = false; s.outputsArmed = false; this.silence(); s.character.action = 'WAIT'; s.sponsor.visibleUntil = 0;
        this.event('stream_ended', 'Stream runtime stopped', now); break;
      case 'mode': {
        const mode = p.mode ?? p.value;
        if (!(['MANUAL', 'ASSISTED', 'AUTOPILOT'] as unknown[]).includes(mode)) return this.result(false, 'Choose MANUAL, ASSISTED or AUTOPILOT.');
        s.mode = mode as FlyMode; s.director.nextAt = now + s.settings.directorIntervalSeconds * 1000; break;
      }
      case 'safe': case 'safe_mode': this.enterSafe(now); break;
      case 'resume':
        s.safe = false; s.running = true; s.outputsArmed = true; s.pausedAI = false; s.health.status = s.health.kick === 'CONNECTED' ? 'READY' : 'DEMO'; s.health.lastError = '';
        s.startedAt = now; s.character.action = 'LOOK_AT'; s.director.nextAt = now + 15_000; if (this.current()) this.current()!.startedAt = now; else this.playNext(now);
        this.event('stream_started', 'Operator explicitly resumed from safe fallback', now); break;
      case 'pause_ai': s.pausedAI = typeof p.paused === 'boolean' ? p.paused : !s.pausedAI; if (s.pausedAI) this.silence(); this.updateBudget(now); break;
      case 'voice_interrupt': this.silence(); this.event('voice_interrupted', 'Operator cancelled shared speech', now); break;
      case 'next': this.playNext(now, true); break;
      case 'queue_add': {
        if (s.queue.length >= BRAIN_LIMITS.queue) return this.result(false, 'Queue is full (40 items).');
        const item = this.parseContent(p, now);
        if (!item) return this.result(false, 'Invalid source or URL. Use an HTTP(S) media URL, uploaded /api/media/ path, or built-in source.');
        s.queue.push(item); break;
      }
      case 'queue_remove': {
        const id = cleanText(p.id, 80);
        if (id === 'sample-loop') return this.result(false, 'The safe fallback must remain available.');
        if (!s.queue.some(item => item.id === id)) return this.result(false, 'Content was not found.');
        if (id === s.currentContentId) { this.finishContent(now, true); s.currentContentId = null; }
        s.queue = s.queue.filter(item => item.id !== id); if (!s.currentContentId && !s.safe) this.playNext(now); break;
      }
      case 'queue_play': {
        const item = s.queue.find(row => row.id === p.id);
        if (!item || !this.canPlay(item)) return this.result(false, 'Broadcast permission and a known license are required (CC also needs attribution).');
        this.finishContent(now, true); this.play(item, now); break;
      }
      case 'mood':
        if (!MOODS.includes(p.mood as FlyMood)) return this.result(false, 'Unknown mood.');
        this.act('LOOK_AT', p.mood as FlyMood, 'Operator selected character mood', 'operator', now); break;
      case 'action':
        if (!ACTIONS.includes(p.action as FlyActionType)) return this.result(false, 'Unknown action.');
        this.act(p.action as FlyActionType, s.character.mood, 'Operator selected animation', 'operator', now); break;
      case 'chat': this.receiveChat({ type: 'chat', userId: safeUserId(p.userId), name: cleanText(p.name) || 'Demo operator', text: cleanText(p.text, 280), demo: true }, now); break;
      case 'demo_event': {
        const type = cleanText(p.type, 40) || 'tip';
        if (!['follow', 'subscription', 'tip', 'visual', 'audio'].includes(type)) return this.result(false, 'Unknown demo event.');
        this.ingest({ type, id: this.id('demo', now), userId: safeUserId(p.userId ?? 'demo-supporter'), name: safeLabel(p.name, 'Demo supporter'), text: cleanText(p.text, 280), amount: num(p.amount, 5, 0, 10_000), currency: cleanText(p.currency, 3) || 'USD', demo: true, payload: p }, now); break;
      }
      case 'poll_create': return this.createPoll(p, now);
      case 'poll_vote': return this.votePoll(safeUserId(p.userId), cleanText(p.option ?? p.optionId ?? p.choice, 30), now);
      case 'game_start': return this.startGame(p.type ?? p.game, now);
      case 'game_vote': return this.voteGame(safeUserId(p.userId), safeLabel(p.name, 'Demo operator', 32), typeof p.choice === 'number' ? p.choice : 0, now);
      case 'cosmetic':
        if (['graphite', 'amber', 'mint'].includes(String(p.body))) s.cosmetics.body = p.body as typeof s.cosmetics.body;
        if (['none', 'lab', 'crown'].includes(String(p.hat))) s.cosmetics.hat = p.hat as typeof s.cosmetics.hat;
        if (['lab', 'night'].includes(String(p.room))) s.cosmetics.room = p.room as typeof s.cosmetics.room;
        break;
      case 'settings': return this.configure(p, now);
      case 'delete_user': this.deleteUser(safeUserId(p.userId)); break;
      case 'clip_mark': this.markClip(now, p, true); break;
      case 'report_metrics': this.reportMetrics(p, now); break;
      case 'ai_reserve': return this.result(this.reserveCost(p, now), 'AI budget reservation evaluated.');
      case 'sponsor_click':
        if (!s.running || !s.outputsArmed || !s.sponsor.enabled || !s.sponsor.url || s.safe || now < s.sponsor.startsAt || now >= s.sponsor.endsAt || now >= s.sponsor.visibleUntil) return this.result(false, 'No active sponsor link.');
        s.sponsor.clicks++; break;
      default: return this.result(false, 'Unknown command.');
    }
    this.bump(now); return this.result(true, 'Applied.');
  }

  tick(now = Date.now()): void {
    now = this.clock(now); const s = this.state;
    const elapsed = Math.max(0, Math.min(5, (now - s.health.lastTickAt) / 1000)); s.health.lastTickAt = now;
    this.updateBudget(now);
    if (s.character.speechExpiresAt && now >= s.character.speechExpiresAt) { s.character.subtitle = ''; s.character.speechExpiresAt = 0; }
    if (this.actionUntil && now >= this.actionUntil) { s.character.action = s.safe || !s.running ? 'WAIT' : 'LOOK_AT'; this.actionUntil = 0; }
    if (s.poll?.status === 'OPEN' && now >= s.poll.endsAt) this.closePoll(now);
    if (s.game && s.game.status !== 'FINISHED' && now >= s.game.endsAt) this.finishGame(now);
    if (s.safe || !s.running) { this.bump(now); return; }
    s.analytics.runningSeconds += elapsed;
    if (s.game?.status === 'WAITING' && now >= s.game.signalAt) { s.game.status = 'LIVE'; s.game.signalAt = now; s.game.endsAt = now + 15_000; s.game.instruction = 'ЗЕЛЁНЫЙ СИГНАЛ — !react'; this.act('SHAKE', 'EXCITED', 'Reaction game signal', 'game', now); }
    s.character.hunger = Math.min(100, s.character.hunger + elapsed * .08);
    s.character.energy = Math.max(0, Math.min(100, s.character.energy + elapsed * (s.character.mood === 'SLEEPY' ? .3 : -.025)));
    this.tickSponsor(now);
    if (s.mode === 'AUTOPILOT' && !s.pausedAI) {
      const current = this.current();
      if (!current || !this.canPlay(current)) this.playNext(now);
      else if (current.startedAt !== undefined && now - current.startedAt >= current.duration * 1000) this.playNext(now);
      if (now >= s.director.nextAt) this.direct(now);
    }
    this.bump(now);
  }

  ingest(input: BrainEvent, now = Date.now()): void {
    if (!input || typeof input.type !== 'string') return;
    now = this.clock(now); const s = this.state; const p = record(input.payload);
    if (input.id && !this.unique(`${input.type}:${cleanText(input.id, 120)}`, now, 300_000)) return;
    if (input.type === 'integration_status') {
      if (['DEMO', 'CONNECTED', 'DISCONNECTED'].includes(String(p.kick))) s.health.kick = p.kick as typeof s.health.kick;
      if (typeof p.providerConfigured === 'boolean') s.costs.providerConfigured = p.providerConfigured;
      if (typeof p.error === 'string') s.health.lastError = cleanText(p.error, 150);
      s.health.status = s.safe ? 'SAFE' : s.health.kick === 'CONNECTED' ? 'READY' : s.health.kick === 'DISCONNECTED' ? 'DEGRADED' : 'DEMO'; this.updateBudget(now);
    } else if (input.type === 'platform_status') {
      if (typeof p.live === 'boolean') s.health.platformLive = p.live;
      s.health.platformTitle = safeLabel(p.title, '', 120);
      if (typeof p.viewers === 'number') s.analytics.viewerCount = num(p.viewers, 0, 0, 1e9);
      this.event('platform_status', p.live ? 'Official integration reports LIVE' : 'Official integration reports OFFLINE', now, input.demo !== false);
    } else if (input.type === 'chat') this.receiveChat(input, now);
    else if (input.type === 'visual' || input.type === 'metrics') this.reportMetrics(p, now);
    else if (input.type === 'audio') {
      const peak = num(p.peak ?? p.level, 0, 0, 1);
      if (this.autonomous() && peak > .85 && this.unique('audio-peak', now, 20_000)) { this.event('audio_peak', 'Local audio amplitude peak (not speech understanding)', now, input.demo !== false, .8, peak); this.act('FLY', 'SCARED', 'Audio amplitude exceeded local threshold', 'audio_peak', now, 'Кто хлопнул дверью в моём ухе?'); }
    } else if (['follow', 'subscription', 'tip'].includes(input.type)) this.support(input, now);
    else if (input.type === 'moderation' || input.type === 'delete_user') this.deleteUser(safeUserId(input.userId));
    else if (input.type === 'ai_response') {
      const moderation = moderateText(input.text);
      if (!this.autonomous() || !moderation.safe || p.moderated !== true) { this.event('ai_rejected', 'AI response blocked by moderation, mode or safety gate', now); this.bump(now); return; }
      if (p.prepaid !== true && !this.reserveCost(p, now)) return;
      s.costs.lastLatencyMs = num(p.latencyMs, 0, 0, 120_000); s.costs.lastModel = safeLabel(p.model, 'optional-provider', 80);
      this.act('SAY', 'CURIOUS', 'Server-moderated optional provider response', 'ai_response', now, moderation.text, .8, s.costs.lastModel, s.costs.lastLatencyMs, p.prepaid === true ? 0 : num(p.costUsd));
    }
    this.bump(now);
  }

  private clock(now: number) { return Math.max(this.state.updatedAt, num(now, this.state.updatedAt, 0, Number.MAX_SAFE_INTEGER)); }
  private id(prefix: string, now: number) { return `${prefix}-${Math.floor(now).toString(36)}-${(++this.sequence).toString(36)}`; }
  private bump(now: number) { this.state.updatedAt = now; this.state.revision++; this.bound(); }
  private result(ok: boolean, message: string): CommandResult { return { ok, message, state: this.snapshot() }; }
  private bound() {
    const s = this.state;
    s.events = s.events.slice(-BRAIN_LIMITS.events); s.actions = s.actions.slice(-BRAIN_LIMITS.actions); s.chat = s.chat.slice(-BRAIN_LIMITS.chat); s.clips = s.clips.slice(-BRAIN_LIMITS.clips);
    s.memory.viewers = s.memory.viewers.slice(-BRAIN_LIMITS.viewers); s.memory.session = s.memory.session.slice(-24); s.monetization.supporters = s.monetization.supporters.slice(-40);
    for (const map of [this.dedup, this.chatTimes, this.commandTimes, this.visualKinds]) while (map.size > BRAIN_LIMITS.dedup) map.delete(map.keys().next().value!);
  }
  private count(type: string, demo = true) { const s = this.state; s.analytics.counters[type] = (s.analytics.counters[type] ?? 0) + 1; const counters = demo ? s.analytics.demoCounters : s.analytics.realCounters; counters[type] = (counters[type] ?? 0) + 1; }
  private event(type: string, summary: string, now: number, demo = true, confidence = 1, novelty = .5, importance = .5, userId?: string, rarity?: Rarity) {
    this.state.events.push({ id: this.id('event', now), at: now, type, summary, demo, confidence, novelty, importance, ...(userId ? { userId } : {}), ...(rarity ? { rarity } : {}) }); this.count(type, demo);
  }
  private unique(key: string, now: number, cooldown: number) { const last = this.dedup.get(key); if (last !== undefined && now - last < cooldown) return false; this.dedup.set(key, now); this.bound(); return true; }
  private random() { let x = this.state.director.seed | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state.director.seed = x >>> 0 || 1; return (x >>> 0) / 4_294_967_296; }
  private current() { return this.state.queue.find(item => item.id === this.state.currentContentId); }
  private autonomous() { const s = this.state; return s.running && !s.safe && !s.pausedAI && s.outputsArmed && s.mode !== 'MANUAL'; }
  private silence() { this.state.character.subtitle = ''; this.state.character.speechExpiresAt = 0; this.state.character.speechId++; }

  private speak(text: string, now: number) {
    const s = this.state;
    if (!s.running || s.safe || s.pausedAI || !s.outputsArmed || now - this.lastSpeechAt < s.settings.speechCooldownSeconds * 1000) return false;
    const check = moderateText(text); if (!check.safe) return false;
    s.character.subtitle = check.text.slice(0, 180); s.character.speechId++; s.character.speechExpiresAt = now + Math.min(12_000, Math.max(4_000, text.length * 75));
    this.lastSpeechAt = now; this.count('fly_spoke'); return true;
  }
  private act(action: FlyActionType, mood: FlyMood, reason: string, event: string, now: number, speech?: string, confidence = 1, model = 'local-rules', latencyMs = 0, costUsd = 0) {
    const s = this.state; if (s.safe || !s.running || !s.outputsArmed) return;
    s.character.action = action; s.character.mood = mood; this.actionUntil = now + (action === 'SLEEP' ? 12_000 : 6_000);
    s.actions.push({ id: this.id('action', now), at: now, event, mood, action, reason, confidence, model, latencyMs, costUsd }); s.memory.lifetimeActions++; this.count('fly_action');
    if (speech) this.speak(speech, now);
    const item = this.current(); if (item) item.reactions++;
  }

  private parseContent(p: Record<string, unknown>, now: number): ContentItem | null {
    const source = p.source as ContentSource;
    if (!['sample', 'synthetic', 'url', 'local', 'capture'].includes(source)) return null;
    const url = typeof p.url === 'string' ? p.url.trim().slice(0, 2_000) : undefined;
    if (source === 'url' && !this.mediaUrl(url)) return null;
    if (source === 'local' && !(url && /^\/api\/media\/[a-zA-Z0-9._-]+$/.test(url))) return null;
    const license = (['owned', 'public-domain', 'cc', 'licensed', 'unknown'].includes(String(p.license)) ? p.license : 'unknown') as ContentLicense;
    return { id: this.id('content', now), title: safeLabel(p.title, 'Untitled content', 120), source, ...(source === 'sample' ? { url: '/sample.webm' } : url ? { url } : {}), duration: num(p.duration, 60, 10, 3600), license, permission: p.permission === true, attribution: cleanText(p.attribution, 200), tags: Array.isArray(p.tags) ? p.tags.slice(0, 8).map(value => safeLabel(value, '', 30)).filter(Boolean) : [], category: safeLabel(p.category, 'video', 30), viewerRequested: p.viewerRequested === true, status: 'UP_NEXT', reactions: 0, moments: [] };
  }
  private mediaUrl(value: string | undefined) { try { const url = new URL(value ?? ''); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } }
  private canPlay(item: ContentItem) { return item.permission === true && ['owned', 'public-domain', 'cc', 'licensed'].includes(item.license) && (item.license !== 'cc' || !!item.attribution.trim()) && (item.source !== 'url' || this.mediaUrl(item.url)); }
  private play(item: ContentItem, now: number) {
    if (!this.canPlay(item)) return;
    for (const other of this.state.queue) if (other.status === 'WATCHING') other.status = 'FINISHED';
    item.status = 'WATCHING'; item.startedAt = now; delete item.finishedAt; this.state.currentContentId = item.id;
    this.event('content_started', item.title, now); this.state.memory.session.push(`Watched: ${item.title}`);
    this.act('CHANGE_VIDEO', 'CURIOUS', 'Selected next content with asserted broadcast permission', 'content_started', now, 'Новое окно. Проверим, есть ли у него вкус.');
  }
  private finishContent(now: number, skipped = false) { const item = this.current(); if (item?.status === 'WATCHING') { item.status = skipped ? 'SKIPPED' : 'FINISHED'; item.finishedAt = now; this.event('content_finished', skipped ? 'Operator skipped current content' : 'Scheduled content segment finished', now); } }
  private playNext(now: number, skipped = false) {
    if (this.state.safe) return;
    const prior = this.state.currentContentId; this.finishContent(now, skipped);
    const allowed = this.state.queue.filter(item => this.canPlay(item));
    let next = allowed.find(item => item.status === 'UP_NEXT');
    if (!next) { for (const item of allowed) if (item.id !== prior) item.status = 'UP_NEXT'; next = allowed.find(item => item.id !== prior) ?? allowed[0]; }
    if (!next) { next = sample(); this.state.queue.unshift(next); }
    this.play(next, now);
  }
  private enterSafe(now: number) {
    const s = this.state; this.finishContent(now, true); s.safe = true; s.running = false; s.outputsArmed = false; s.pausedAI = true; this.silence(); this.actionUntil = 0;
    s.character.action = 'WAIT'; s.character.mood = 'CURIOUS'; s.sponsor.visibleUntil = 0;
    if (s.game && s.game.status !== 'FINISHED') { s.game.status = 'FINISHED'; s.game.result = 'Cancelled by SAFE MODE.'; }
    if (s.poll?.status === 'OPEN') { s.poll.status = 'CLOSED'; s.poll.winner = null; }
    const fallback = sample(); fallback.status = 'WATCHING'; fallback.startedAt = now;
    s.queue = [fallback, ...s.queue.filter(item => item.id !== fallback.id).map(item => item.status === 'WATCHING' ? { ...item, status: 'SKIPPED' as const } : item)].slice(0, BRAIN_LIMITS.queue); s.currentContentId = fallback.id;
    s.health.status = 'SAFE'; s.health.ai = 'PAUSED'; this.event('safe_mode', 'Outputs disarmed; external source replaced by authored local sample', now);
  }

  private reportMetrics(p: Record<string, unknown>, now: number) {
    if (now - this.lastMetricsAt < 900) return;
    this.lastMetricsAt = now; const s = this.state;
    if (typeof p.fps === 'number') s.analytics.fps = num(p.fps, 0, 0, 240);
    if (typeof p.processingMs === 'number') s.analytics.processingMs = num(p.processingMs, 0, 0, 10_000);
    // Source pixels are processed in VisionEngine. These features do not imply recorded neural activity.
    const motion = num(p.motion, num(p.right) + num(p.left) + num(p.up) + num(p.down), 0, 2);
    const change = num(p.change, 0, 0, 2); const luminance = num(p.luminance, 0, 0, 1);
    const novelty = Math.min(1, Math.abs(change - s.signals.change) * 3 + Math.abs(luminance - s.signals.luminance) + Math.abs(motion - s.signals.motion));
    const confidence = num(p.confidence, .82, 0, 1);
    s.signals = { source: 'MODELLED', at: now, motion, change, luminance, on: num(p.on, 0, 0, 2), off: num(p.off, 0, 0, 2), confidence, novelty };
    if (!this.autonomous() || confidence < .55 || now - this.lastVisualAt < 8_000) return;
    let kind = '', mood: FlyMood = 'CURIOUS', action: FlyActionType = 'LOOK_AT', text = '';
    if (change > .22 && novelty > .12) { kind = 'scene_change'; mood = 'SCARED'; action = 'FLY'; text = 'Кадр прыгнул. Я тоже. Наука согласована.'; }
    else if (motion > .09 && novelty > .025) { kind = 'motion_burst'; mood = 'EXCITED'; action = 'SHAKE'; text = 'Оно движется. Значит, обязано объясниться.'; }
    else if (luminance < .08 && s.signals.off > .2) { kind = 'lights_out'; mood = 'CONFUSED'; text = 'Кто выключил моё окно? Я ещё смотрела.'; }
    else if (s.signals.on > .6 && novelty > .1) { kind = 'brightness_step'; mood = 'OVERSTIMULATED'; action = 'SHAKE'; text = 'Слишком много фотонов на одну муху.'; }
    if (!kind || now - (this.visualKinds.get(kind) ?? -Infinity) < 25_000) return;
    this.visualKinds.set(kind, now); this.lastVisualAt = now;
    this.event('visual_event', kind, now, true, confidence, novelty, Math.max(change, motion)); this.act(action, mood, `Local ${kind}: motion ${motion.toFixed(3)}, change ${change.toFixed(3)}, novelty ${novelty.toFixed(2)}; fictional reaction`, kind, now, text, confidence);
    if (novelty > .55) this.markClip(now, { title: 'M0XA versus a sudden change', score: 75 + novelty * 20, reason: `${kind}; local feature novelty` }, false);
  }

  private viewer(id: string, name: string, now: number): ViewerMemory {
    let user = this.state.memory.viewers.find(row => row.userId === id);
    if (!user) { user = { userId: id, name: safeLabel(name, 'Viewer', 32), messages: 0, commands: 0, score: 0, subscriber: false, lastSeenAt: now }; this.state.memory.viewers.push(user); }
    user.lastSeenAt = now; this.state.analytics.uniqueParticipants = Math.min(this.state.memory.viewers.length, BRAIN_LIMITS.viewers); return user;
  }
  private receiveChat(event: BrainEvent, now: number) {
    const s = this.state; const id = safeUserId(event.userId); const demo = event.demo !== false; const moderation = moderateText(event.text);
    if (!moderation.safe || now - (this.chatTimes.get(id) ?? -Infinity) < 1_500 || s.safe) { s.analytics.messagesBlocked++; this.count('chat_blocked', demo); return; }
    this.chatTimes.set(id, now); const name = safeLabel(event.name, 'Viewer', 32); const user = this.viewer(id, name, now); user.messages++;
    const message: ChatMessage = { id: this.id('chat', now), at: now, userId: id, name, text: moderation.text, demo, bot: false };
    s.chat.push(message); s.analytics.messagesAccepted++; this.event('chat_received', 'Moderated viewer message received', now, demo, 1, .2, .2, id);
    if (!moderation.text.startsWith('!') || !this.autonomous()) return;
    const [verb, ...args] = moderation.text.toLowerCase().split(/\s+/); const choice = args[0];
    if (verb === '!vote' || verb === '!choose') { this.votePoll(id, choice ?? '', now, demo); return; }
    if (verb === '!react') { if (s.game?.type === 'reaction') this.voteGame(id, name, 0, now, demo); return; }
    if (verb === '!food' && s.game?.type === 'findfood' && s.game.status !== 'FINISHED') { this.voteGame(id, name, Number(choice), now, demo); return; }
    if (now - (this.commandTimes.get(id) ?? -Infinity) < s.settings.commandCooldownSeconds * 1000 || now - this.lastGlobalCommandAt < 2_500) { this.count('command_rate_limited', demo); return; }
    this.commandTimes.set(id, now); this.lastGlobalCommandAt = now; user.commands++;
    const reactions: Record<string, [FlyActionType, FlyMood, string]> = {
      '!fly': ['FLY', 'EXCITED', 'Взлёт разрешён. Посадка — импровизация.'], '!dance': ['DANCE', 'CHAOTIC', 'Шесть лап. Ритм один. Конфликт интересов.'], '!food': ['EAT', 'HUNGRY', 'Крошка принята. Лабораторный анализ: вкусно.'],
      '!scare': ['FLY', 'SCARED', 'Я не испугалась. Это вертикальное размышление.'], '!sleep': ['SLEEP', 'SLEEPY', 'Закрываю все шесть вкладок.'], '!wake': ['SHAKE', 'CURIOUS', 'Кто потревожил хранительницу Escape?'], '!zoom': ['ZOOM_CAMERA', 'CURIOUS', 'Ближе. Хочу рассмотреть ваши пиксели.'],
      '!brain': ['SHOW_OVERLAY', 'CURIOUS', 'Модель считает сигналы. Я придумываю драму. Не путать.'], '!pov': ['SHOW_OVERLAY', 'CURIOUS', 'Сетка — это модель зрения. Мнение принадлежит мне.'], '!mood': ['RESPOND_CHAT', s.character.mood, 'Настроение: шесть лап в разных направлениях.'],
      '!stats': ['RESPOND_CHAT', 'CURIOUS', 'Живу под Escape. Работаю за крошки. Всё остальное — телеметрия.'], '!history': ['RESPOND_CHAT', 'CURIOUS', 'Сначала был фотон. Потом я попросила добавки.'], '!question': ['RESPOND_CHAT', 'CONFUSED', 'Хороший вопрос. Отправила его на рассмотрение лапам.'], '!rate': ['RESPOND_CHAT', 'CURIOUS', 'Ставлю пять лап из шести. Шестой держусь за стол.'],
    };
    const reaction = reactions[verb]; if (!reaction) return;
    if (verb === '!food') s.character.hunger = Math.max(0, s.character.hunger - 18);
    if (verb === '!brain' || verb === '!pov') s.settings.scienceUntil = now + 20_000;
    if (verb === '!zoom') s.settings.camera = 'close';
    this.act(...reaction.slice(0, 2) as [FlyActionType, FlyMood], 'Accepted moderated, rate-limited chat command', verb, now, reaction[2]);
    this.botReply(reaction[2], now, demo);
  }
  private botReply(text: string, now: number, demo: boolean) { this.state.chat.push({ id: this.id('bot', now), at: now, userId: 'm0xa', name: 'M0XA', text, demo, bot: true }); this.count('chat_replied', demo); }

  private support(input: BrainEvent, now: number) {
    const s = this.state; const demo = input.demo !== false; const id = safeUserId(input.userId); const name = safeLabel(input.name, 'Supporter', 32); const ledger = demo ? s.monetization.demo : s.monetization.real;
    const user = this.viewer(id, name, now);
    if (input.type === 'follow') ledger.follows++;
    else if (input.type === 'subscription') { ledger.subscriptions++; user.subscriber = true; s.monetization.supporters.push({ userId: id, name, demo, kind: 'subscription' }); }
    else {
      const amount = num(input.amount, 0, 0, 1e6); const currency = /^[A-Z]{3}$/.test(input.currency ?? '') ? input.currency! : 'USD';
      if (!amount) return;
      // Aggregate at most 32 distinct ISO currency codes; never interpret provider payload as HTML or speech.
      if (!(currency in ledger.currencies) && Object.keys(ledger.currencies).length >= 32) return;
      ledger.currencies[currency] = Math.round(((ledger.currencies[currency] ?? 0) + amount) * 100) / 100; ledger.tipCount++;
      if (currency === s.monetization.currency) { ledger.tips = Math.round((ledger.tips + amount) * 100) / 100; const key = demo ? 'demoProgress' : 'realProgress'; s.monetization.goal[key] = ledger.tips; if (s.monetization.goal.realProgress >= s.monetization.goal.target) s.cosmetics.room = 'night'; }
      s.monetization.supporters.push({ userId: id, name, demo, kind: 'tip' });
    }
    this.event(input.type, `${demo ? 'DEMO' : 'Verified integration'} ${input.type} event`, now, demo, 1, .65, .8, id);
    if (!this.autonomous()) return;
    if (input.type === 'tip' && (num(input.amount) < s.settings.minTipAmount || now - this.lastTipReactionAt < s.settings.tipCooldownSeconds * 1000)) return;
    if (input.type === 'tip') this.lastTipReactionAt = now;
    const text = input.type === 'subscription' ? 'В лаборатории стало на одного соучастника больше.' : input.type === 'tip' ? demo ? 'Демонстрационная крошка. Настоящая благодарность. Денег здесь нет.' : 'Крошка для лаборатории принята. Тихое жужжание благодарности.' : 'Ещё один наблюдатель. Ведите себя естественно. Я тоже попробую.';
    this.act(input.type === 'follow' ? 'LOOK_AT' : 'DANCE', 'EXCITED', `${demo ? 'Demo' : 'Verified'} ${input.type}; no raw supporter text is spoken`, input.type, now, text);
    if (input.type !== 'follow') this.markClip(now, { title: input.type === 'tip' ? 'The laboratory receives a crumb' : 'A new laboratory accomplice', reason: `${demo ? 'DEMO' : 'Real'} ${input.type} reaction`, score: 78, demo }, false);
  }

  private createPoll(p: Record<string, unknown>, now: number): CommandResult {
    if (this.state.poll?.status === 'OPEN' && now < this.state.poll.endsAt) return this.result(false, 'A poll is already running.');
    const options = Array.isArray(p.options) ? p.options.slice(0, 4).map(label => safeLabel(label, '', 50)).filter(Boolean) : ['Light experiment', 'Food hunt'];
    if (options.length < 2 || new Set(options).size !== options.length) return this.result(false, 'Use 2–4 distinct safe options.');
    this.state.poll = { id: this.id('poll', now), question: safeLabel(p.question, 'What should M0XA investigate?', 120), options: options.map((label, i) => ({ id: String(i + 1), label, votes: 0 })), voters: {}, startedAt: now, endsAt: now + num(p.duration, 30, 10, 300) * 1000, status: 'OPEN', winner: null };
    this.event('poll_created', 'One-person, one-vote community poll opened', now); this.bump(now); return this.result(true, 'Poll opened. Use !vote 1 or !vote 2.');
  }
  private votePoll(userId: string, option: string, now: number, demo = true): CommandResult {
    const poll = this.state.poll;
    if (!poll || poll.status !== 'OPEN' || now >= poll.endsAt) return this.result(false, 'No open poll.');
    if (!poll.options.some(row => row.id === option)) return this.result(false, 'Choose an existing option ID.');
    if (Object.hasOwn(poll.voters, userId)) return this.result(false, 'Each participant has one vote.');
    if (Object.keys(poll.voters).length >= BRAIN_LIMITS.participants) return this.result(false, 'This demo poll reached its participant limit.');
    Object.defineProperty(poll.voters, userId, { value: option, configurable: true, enumerable: true, writable: true }); poll.options.find(row => row.id === option)!.votes++;
    this.event('poll_vote', 'Community vote recorded', now, demo, 1, .2, .3, userId); this.bump(now); return this.result(true, 'Vote recorded.');
  }
  private closePoll(now: number) {
    const poll = this.state.poll!; poll.status = 'CLOSED'; const best = Math.max(...poll.options.map(option => option.votes)); const winners = poll.options.filter(option => option.votes === best); poll.winner = best > 0 && winners.length === 1 ? winners[0].id : null;
    this.event('poll_closed', poll.winner ? 'Community poll closed with a winner' : 'Community poll ended in a tie or without votes', now);
    if (this.autonomous()) this.act('LOOK_AT', 'CURIOUS', 'Community poll completed', 'poll_closed', now, poll.winner ? 'Лапы пересчитаны. Решение принято.' : 'Мнения разошлись. Прямо как мои лапы.');
  }
  private startGame(type: unknown, now: number): CommandResult {
    if (type !== 'findfood' && type !== 'reaction') return this.result(false, 'Choose findfood or reaction.');
    if (this.state.game && this.state.game.status !== 'FINISHED' && now < this.state.game.endsAt) return this.result(false, 'A game is already running.');
    const delay = 2_000 + Math.floor(this.random() * 4_000);
    this.state.game = { id: this.id('game', now), type, status: type === 'reaction' ? 'WAITING' : 'LIVE', title: type === 'reaction' ? 'REACTION TEST' : 'FIND FOOD', instruction: type === 'reaction' ? 'Wait for GREEN, then !react. Early responses lose.' : 'Find the illuminated crumb: !food 1, !food 2 or !food 3. One attempt.', startedAt: now, signalAt: type === 'reaction' ? now + delay : now, endsAt: now + (type === 'reaction' ? delay + 15_000 : 25_000), target: 1 + Math.floor(this.random() * 3), entries: [], winner: null, result: '' };
    this.event('game_started', `${type} round started; no payment or subscription advantage`, now); this.bump(now); return this.result(true, 'Game started.');
  }
  private voteGame(userId: string, name: string, choice: number, now: number, demo = true): CommandResult {
    const game = this.state.game;
    if (!game || game.status === 'FINISHED' || now >= game.endsAt) return this.result(false, 'No active game.');
    if (game.entries.some(entry => entry.userId === userId)) return this.result(false, 'One attempt per participant.');
    if (game.entries.length >= BRAIN_LIMITS.participants) return this.result(false, 'This demo game reached its participant limit.');
    if (game.type === 'findfood' && ![1, 2, 3].includes(choice)) return this.result(false, 'Choose 1, 2 or 3.');
    const score = game.type === 'findfood' ? (choice === game.target ? 100 : 0) : game.status !== 'LIVE' || now < game.signalAt ? 0 : Math.max(1, 10_000 - (now - game.signalAt));
    game.entries.push({ userId, name: safeLabel(name, 'Viewer', 32), choice, at: now, score }); this.viewer(userId, name, now).score += score > 0 ? 1 : 0;
    if (score > 0 && game.type === 'reaction') { const latency = now - game.signalAt; const best = this.state.memory.bestReactionMs; this.state.memory.bestReactionMs = best === null ? latency : Math.min(best, latency); }
    this.event('game_attempt', score > 0 ? 'Correct game response received' : 'Incorrect or early game response received', now, demo, 1, .3, .3, userId);
    this.bump(now); return this.result(true, score > 0 ? 'Correct response recorded.' : 'Attempt recorded; incorrect or too early.');
  }
  private finishGame(now: number) {
    const game = this.state.game!; game.status = 'FINISHED'; const ranked = game.entries.filter(entry => entry.score > 0).sort((a, b) => b.score - a.score || a.at - b.at); game.winner = ranked[0]?.userId ?? null;
    game.result = ranked.length ? `${ranked.length} correct response${ranked.length === 1 ? '' : 's'}. ${game.type === 'reaction' ? `Fastest: ${ranked[0].at - game.signalAt} ms (server arrival, includes network latency).` : `Crumb was at position ${game.target}.`}` : 'No correct responses this round.';
    this.event('game_finished', game.result, now);
    if (this.autonomous()) this.act('EAT', 'EXCITED', 'Minigame scored from actual received attempts', 'game_finished', now, ranked.length ? 'Нашли! Записываю вас в почётные лапы лаборатории.' : 'Пока вы думали, крошка задумалась тоже.');
  }

  private direct(now: number) {
    const s = this.state; const d = s.director; d.nextAt = now + (s.settings.directorIntervalSeconds + this.random() * 12) * 1000;
    const roll = this.random(); let rarity: Rarity = roll > .994 ? 'LEGENDARY' : roll > .94 ? 'RARE' : roll > .69 ? 'UNCOMMON' : 'COMMON';
    if (now - d.lastRarityAt[rarity] < RARITY_GAP[rarity]) rarity = 'COMMON';
    if (now - d.lastRarityAt.COMMON < RARITY_GAP.COMMON && rarity === 'COMMON') return;
    d.lastRarityAt[rarity] = now; d.eventCount++;
    const pool: { key: string; action: FlyActionType; mood: FlyMood; text: string }[] = rarity === 'LEGENDARY' ? [{ key: 'escape-council', action: 'FLY', mood: 'CHAOTIC', text: 'Совет клавиши Escape объявляет: сегодня улетаем торжественно.' }] : rarity === 'RARE' ? [{ key: 'photon-inspection', action: 'ZOOM_CAMERA', mood: 'CONFUSED', text: 'Этот фотон уже приходил. Узнала по походке.' }, { key: 'six-leg-concert', action: 'DANCE', mood: 'CHAOTIC', text: 'Редкий концерт для шести лап и одного раздражённого монитора.' }] : rarity === 'UNCOMMON' ? [{ key: 'crumb-hunt', action: 'EAT', mood: 'HUNGRY', text: 'В лаборатории пропала крошка. Назначаю всех подозреваемыми.' }, { key: 'night-patrol', action: 'CHANGE_SCENE', mood: 'CURIOUS', text: 'Ночная смена. Монитор теперь официально луна.' }] : [{ key: 'hungry', action: 'EAT', mood: 'HUNGRY', text: 'Ни одной крошки между пикселями. Безобразие.' }, { key: 'clean-feet', action: 'MOVE', mood: 'CURIOUS', text: 'Мою лапы. Мыслей пока шесть.' }, { key: 'photon-break', action: 'SLEEP', mood: 'SLEEPY', text: 'Маленький перерыв. Большие глаза тоже устают.' }, { key: 'cursor-patrol', action: 'LOOK_AT', mood: 'CURIOUS', text: 'Курсор опять убежал. Ничего, я запомнила его форму.' }];
    const choices = pool.filter(event => event.key !== d.lastEvent); const selected = (choices.length ? choices : pool)[Math.floor(this.random() * (choices.length || pool.length))]; d.lastEvent = selected.key;
    this.event(rarity === 'COMMON' ? 'director_event' : 'rare_event', selected.key, now, true, 1, rarity === 'COMMON' ? .4 : .9, rarity === 'COMMON' ? .4 : .85, undefined, rarity);
    this.act(selected.action, selected.mood, `Seeded event director; ${rarity}; rarity cooldown satisfied`, selected.key, now, selected.text);
    if (selected.key === 'night-patrol') s.cosmetics.room = s.cosmetics.room === 'night' ? 'lab' : 'night';
    if (selected.key === 'crumb-hunt' && (!s.game || s.game.status === 'FINISHED')) this.startGame('findfood', now);
    if (d.eventCount % 5 === 0 && (!s.game || s.game.status === 'FINISHED')) this.startGame(d.eventCount % 10 === 0 ? 'reaction' : 'findfood', now);
    if (d.eventCount % 4 === 0 && (!s.poll || s.poll.status === 'CLOSED')) this.createPoll({ question: 'What should M0XA investigate?', options: ['More photons', 'A quiet crumb'], duration: 30 }, now);
    if (rarity === 'RARE' || rarity === 'LEGENDARY') this.markClip(now, { title: `${selected.key} · M0XA`, score: rarity === 'LEGENDARY' ? 99 : 88, reason: `${rarity} director event` }, false);
  }

  private markClip(now: number, p: Record<string, unknown>, manual: boolean) {
    if (!manual && now - this.lastClipAt < 30_000) return;
    this.lastClipAt = now; const s = this.state; const pre = num(p.preSeconds, 20, 15, 30); const post = num(p.postSeconds, 25, 15, 45);
    const marker: ClipMarker = { id: this.id('clip', now), at: now, title: safeLabel(p.title, 'M0XA has an opinion', 100), context: this.current()?.title ?? 'Laboratory', subtitle: s.character.subtitle, contentId: s.currentContentId, score: num(p.score, 80, 0, 100), preSeconds: pre, postSeconds: post, startAt: Math.max(0, now - pre * 1000), endAt: now + post * 1000, status: 'MARKER_ONLY', reason: safeLabel(p.reason, manual ? 'Operator marked a candidate' : 'Automatic candidate', 180), demo: p.demo !== false };
    s.clips.push(marker); const content = this.current(); if (content) content.moments = [...content.moments, now].slice(-40); this.event('clip_candidate', 'Metadata marker created; no video has been exported', now, marker.demo, 1, marker.score / 100, marker.score / 100);
  }

  private configure(p: Record<string, unknown>, now: number): CommandResult {
    const s = this.state;
    const sponsor = record(p.sponsor);
    if (sponsor.url !== undefined && sponsor.url !== '' && !this.mediaUrl(String(sponsor.url))) return this.result(false, 'Sponsor link must be a valid HTTP(S) URL without credentials.');
    const bounds: Partial<Record<keyof FlySettings, [number, number]>> = { volume: [0, 1], speechCooldownSeconds: [5, 120], commandCooldownSeconds: [2, 60], directorIntervalSeconds: [25, 600], minTipAmount: [.01, 1e6], tipCooldownSeconds: [10, 300], aiMaxHour: [0, 100], aiMaxDay: [0, 1000] };
    for (const [key, range] of Object.entries(bounds)) if (typeof p[key] === 'number') Object.assign(s.settings, { [key]: num(p[key], 0, range[0], range[1]) });
    if (typeof p.voiceEnabled === 'boolean') { s.settings.voiceEnabled = p.voiceEnabled; if (!p.voiceEnabled) this.silence(); }
    if (['browser', 'mock', 'server'].includes(String(p.voiceProvider))) { s.settings.voiceProvider = p.voiceProvider as FlySettings['voiceProvider']; s.health.tts = s.settings.voiceProvider.toUpperCase() as typeof s.health.tts; }
    if (['desk', 'close', 'wide'].includes(String(p.camera))) s.settings.camera = p.camera as FlySettings['camera'];
    // The profanity gate cannot be disabled for incoming text; this setting is kept true deliberately.
    s.settings.profanityFilter = true;
    const goal = record(p.goal);
    if (goal.title !== undefined) s.monetization.goal.title = safeLabel(goal.title, s.monetization.goal.title, 60);
    if (typeof goal.target === 'number') s.monetization.goal.target = num(goal.target, 100, 1, 1e6);
    if (Object.keys(sponsor).length) {
      if (sponsor.title !== undefined) s.sponsor.title = safeLabel(sponsor.title, 'Laboratory sponsor', 80);
      if (sponsor.url !== undefined) s.sponsor.url = String(sponsor.url).slice(0, 2000);
      if (typeof sponsor.enabled === 'boolean') s.sponsor.enabled = sponsor.enabled;
      if (typeof sponsor.startsAt === 'number') s.sponsor.startsAt = num(sponsor.startsAt, now, 0, Number.MAX_SAFE_INTEGER);
      if (typeof sponsor.endsAt === 'number') s.sponsor.endsAt = num(sponsor.endsAt, 0, 0, Number.MAX_SAFE_INTEGER);
      if (typeof sponsor.intervalSeconds === 'number') s.sponsor.intervalSeconds = num(sponsor.intervalSeconds, 900, 300, 86_400);
      if (typeof sponsor.durationSeconds === 'number') s.sponsor.durationSeconds = num(sponsor.durationSeconds, 15, 5, 30);
      if (typeof sponsor.maxPerHour === 'number') s.sponsor.maxPerHour = num(sponsor.maxPerHour, 4, 1, 6);
      s.sponsor.disclosure = 'ADVERTISEMENT · РЕКЛАМА'; if (!s.sponsor.enabled) s.sponsor.visibleUntil = 0;
    }
    this.updateBudget(now); this.bump(now); return this.result(true, 'Settings saved.');
  }
  private tickSponsor(now: number) {
    const sponsor = this.state.sponsor;
    if (!this.state.running || !this.state.outputsArmed || !sponsor.enabled || !sponsor.url || this.state.safe || now < sponsor.startsAt || !sponsor.endsAt || now >= sponsor.endsAt) { sponsor.visibleUntil = 0; return; }
    if (now - sponsor.hourStartedAt >= 3_600_000) { sponsor.hourStartedAt = now; sponsor.shownThisHour = 0; }
    if (sponsor.shownThisHour >= sponsor.maxPerHour || (sponsor.lastShownAt > 0 && now - sponsor.lastShownAt < sponsor.intervalSeconds * 1000)) return;
    if (!this.speak('Реклама. Этот показ оплачен спонсором лаборатории.', now)) return;
    sponsor.visibleUntil = Math.min(sponsor.endsAt, now + sponsor.durationSeconds * 1000); sponsor.lastShownAt = now; sponsor.impressions++; sponsor.shownThisHour++; this.event('sponsor_impression', 'Sponsor slot scheduled with explicit visual and speech disclosure (slot count, not verified viewers)', now);
  }
  private updateBudget(now: number) {
    const s = this.state; const c = s.costs;
    if (now - c.hourStartedAt >= 3_600_000) { c.hourStartedAt = now; c.hourUsd = 0; }
    if (now - c.dayStartedAt >= 86_400_000) { c.dayStartedAt = now; c.dayUsd = 0; }
    const ratio = Math.max(s.settings.aiMaxHour > 0 ? c.hourUsd / s.settings.aiMaxHour : 1, s.settings.aiMaxDay > 0 ? c.dayUsd / s.settings.aiMaxDay : 1);
    c.tier = !c.providerConfigured || ratio >= 1 ? 'local' : ratio >= .9 ? 'sparse' : ratio >= .7 ? 'economy' : 'full';
    s.health.ai = s.safe || s.pausedAI ? 'PAUSED' : ratio >= 1 ? 'BUDGET_LIMIT' : c.providerConfigured ? 'READY' : 'LOCAL';
  }
  private reserveCost(p: Record<string, unknown>, now: number) {
    this.updateBudget(now); const s = this.state; const cost = num(p.costUsd, -1, 0, 100);
    if (!this.autonomous() || cost < 0 || s.costs.hourUsd + cost > s.settings.aiMaxHour || s.costs.dayUsd + cost > s.settings.aiMaxDay || s.settings.aiMaxHour === 0 || s.settings.aiMaxDay === 0) { s.costs.blocked++; this.bump(now); return false; }
    s.costs.hourUsd += cost; s.costs.dayUsd += cost; s.costs.totalUsd += cost; s.costs.requests++; s.costs.lastModel = safeLabel(p.model, 'optional-provider', 80); this.updateBudget(now); this.bump(now); return true;
  }
  private deleteUser(id: string) {
    const s = this.state;
    s.memory.viewers = s.memory.viewers.filter(user => user.userId !== id); s.chat = s.chat.filter(message => message.userId !== id); s.events = s.events.filter(event => event.userId !== id); s.monetization.supporters = s.monetization.supporters.filter(user => user.userId !== id);
    if (s.poll && Object.hasOwn(s.poll.voters, id)) { const selected = s.poll.options.find(option => option.id === s.poll!.voters[id]); if (selected) selected.votes = Math.max(0, selected.votes - 1); delete s.poll.voters[id]; }
    if (s.game) { s.game.entries = s.game.entries.filter(entry => entry.userId !== id); if (s.game.winner === id) s.game.winner = null; }
    this.chatTimes.delete(id); this.commandTimes.delete(id); s.analytics.uniqueParticipants = s.memory.viewers.length;
  }
}

export const createBrain = (initial?: Partial<FlyBrainState>) => new FlyBrain(initial);
