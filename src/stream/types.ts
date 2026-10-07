/** Shared public contract. All timestamps are Unix milliseconds; durations are seconds. */
export type FlyMode = 'MANUAL' | 'ASSISTED' | 'AUTOPILOT';
export type FlyMood = 'CURIOUS' | 'BORED' | 'EXCITED' | 'CONFUSED' | 'ANNOYED' | 'SCARED' | 'HUNGRY' | 'OVERSTIMULATED' | 'SLEEPY' | 'CHAOTIC';
export type FlyActionType = 'SAY' | 'LOOK_AT' | 'MOVE' | 'FLY' | 'LAND' | 'SHAKE' | 'DANCE' | 'EAT' | 'SLEEP' | 'ZOOM_CAMERA' | 'CHANGE_SCENE' | 'SHOW_OVERLAY' | 'RESPOND_CHAT' | 'CREATE_POLL' | 'CHANGE_VIDEO' | 'PAUSE_VIDEO' | 'REPLAY' | 'SAVE_CLIP_MARKER' | 'IGNORE' | 'WAIT';
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';
export type ContentSource = 'sample' | 'synthetic' | 'url' | 'local' | 'capture';
export type ContentLicense = 'owned' | 'public-domain' | 'cc' | 'licensed' | 'unknown';
export interface ContentItem {
  id: string; title: string; source: ContentSource; url?: string; duration: number;
  license: ContentLicense; permission: boolean; attribution: string; tags: string[];
  category: string; viewerRequested: boolean; status: 'UP_NEXT' | 'WATCHING' | 'FINISHED' | 'SKIPPED';
  startedAt?: number; finishedAt?: number; reactions: number; moments: number[];
}
export interface BrainEvent {
  type: string; id?: string; userId?: string; name?: string; text?: string;
  amount?: number; currency?: string; demo?: boolean; payload?: Record<string, unknown>;
}
export interface FlyCommand { type: string; payload?: Record<string, unknown> }
export interface CommandResult { ok: boolean; message: string; state: FlyBrainState }
export interface ObservedEvent {
  id: string; at: number; type: string; summary: string; demo: boolean;
  confidence: number; novelty: number; importance: number; userId?: string; rarity?: Rarity;
}
export interface FlyDecision {
  id: string; at: number; event: string; mood: FlyMood; action: FlyActionType;
  reason: string; confidence: number; model: string; latencyMs: number; costUsd: number;
}
export interface ChatMessage { id: string; at: number; userId: string; name: string; text: string; demo: boolean; bot: boolean }
export interface ViewerMemory {
  userId: string; name: string; messages: number; commands: number; score: number;
  subscriber: boolean; lastSeenAt: number;
}
export interface FlyPoll {
  id: string; question: string; options: { id: string; label: string; votes: number }[];
  voters: Record<string, string>; startedAt: number; endsAt: number; status: 'OPEN' | 'CLOSED'; winner: string | null;
}
export interface FlyGame {
  id: string; type: 'findfood' | 'reaction'; status: 'WAITING' | 'LIVE' | 'FINISHED';
  title: string; instruction: string; startedAt: number; signalAt: number; endsAt: number;
  /** FIND FOOD target is revealed in the shared scene when LIVE. */
  target: number; entries: { userId: string; name: string; choice: number; at: number; score: number }[];
  winner: string | null; result: string;
}
export interface ClipMarker {
  id: string; at: number; title: string; context: string; subtitle: string; contentId: string | null;
  score: number; preSeconds: number; postSeconds: number; startAt: number; endAt: number;
  status: 'MARKER_ONLY'; reason: string; demo: boolean;
}
export interface MoneyLedger {
  tips: number; tipCount: number; subscriptions: number; follows: number;
  /** Amounts are never converted or added across currencies. */
  currencies: Record<string, number>;
}
export interface FlySettings {
  volume: number; voiceEnabled: boolean; voiceProvider: 'browser' | 'mock' | 'server';
  speechCooldownSeconds: number; commandCooldownSeconds: number; directorIntervalSeconds: number;
  minTipAmount: number; tipCooldownSeconds: number; aiMaxHour: number; aiMaxDay: number;
  profanityFilter: boolean; scienceUntil: number; camera: 'desk' | 'close' | 'wide';
}
export interface ContentRecommendation {
  id: 'content' | 'participation' | 'clips'; title: string; reason: string;
  /** A suggested editorial sequence, never an automatic promise of performance. */
  order: number; durationSeconds: number; command: FlyCommand | null;
  evidence: 'OBSERVED' | 'INSUFFICIENT_DATA';
}
export interface ContentDirectorReport {
  suggestions: ContentRecommendation[];
  sample: { retainedRealChat: number; retainedDemoChat: number; retainedRealParticipants: number; retainedClipMarkers: number; recordedRealVotes: number; recordedRealGameAttempts: number };
  unavailable: { retention: null; averageWatchTime: null; returningViewers: null; revenuePerViewer: null; subscriptionRevenue: null };
  caveat: string;
}
export interface FlyBrainState {
  version: 1; revision: number; updatedAt: number; startedAt: number | null;
  mode: FlyMode; running: boolean; safe: boolean; pausedAI: boolean; outputsArmed: boolean;
  character: { name: 'M0XA'; displayName: 'Мокса'; mood: FlyMood; action: FlyActionType; subtitle: string; speechId: number; speechExpiresAt: number; energy: number; hunger: number; lore: string; recurringJoke: string };
  queue: ContentItem[]; currentContentId: string | null;
  events: ObservedEvent[]; actions: FlyDecision[]; chat: ChatMessage[];
  memory: { viewers: ViewerMemory[]; session: string[]; lifetimeActions: number; bestReactionMs: number | null };
  poll: FlyPoll | null; game: FlyGame | null; clips: ClipMarker[];
  analytics: { counters: Record<string, number>; demoCounters: Record<string, number>; realCounters: Record<string, number>; startedAt: number; runningSeconds: number; messagesAccepted: number; messagesBlocked: number; uniqueParticipants: number; fps: number | null; processingMs: number | null; viewerCount: number | null };
  monetization: { demo: MoneyLedger; real: MoneyLedger; currency: string; goal: { title: string; target: number; demoProgress: number; realProgress: number; unlock: 'night-room' }; supporters: { userId: string; name: string; demo: boolean; kind: 'subscription' | 'tip' }[] };
  sponsor: { enabled: boolean; title: string; url: string; disclosure: string; startsAt: number; endsAt: number; intervalSeconds: number; durationSeconds: number; maxPerHour: number; impressions: number; clicks: number; lastShownAt: number; visibleUntil: number; hourStartedAt: number; shownThisHour: number };
  cosmetics: { body: 'graphite' | 'amber' | 'mint'; hat: 'none' | 'lab' | 'crown'; room: 'lab' | 'night' };
  settings: FlySettings;
  costs: { hourUsd: number; dayUsd: number; totalUsd: number; hourStartedAt: number; dayStartedAt: number; tier: 'local' | 'sparse' | 'economy' | 'full'; requests: number; blocked: number; lastModel: string; lastLatencyMs: number; providerConfigured: boolean };
  health: { status: 'DEMO' | 'READY' | 'DEGRADED' | 'SAFE'; kick: 'DEMO' | 'CONNECTED' | 'DISCONNECTED'; ai: 'LOCAL' | 'READY' | 'BUDGET_LIMIT' | 'PAUSED'; tts: 'BROWSER' | 'MOCK' | 'SERVER'; lastError: string; lastTickAt: number; platformLive: boolean | null; platformTitle: string };
  signals: { source: 'MODELLED'; at: number; motion: number; change: number; luminance: number; on: number; off: number; confidence: number; novelty: number };
  director: { seed: number; nextAt: number; lastRarityAt: Record<Rarity, number>; lastEvent: string; eventCount: number };
}
