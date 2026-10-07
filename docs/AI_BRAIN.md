# M0XA runtime and editorial director

`src/stream/brain.ts` is the deterministic, server-owned character state machine. It does not call an AI provider, fetch media, render the scene, or play audio itself. It accepts `command`, `ingest` and `tick`, then returns a cloned state snapshot for the operator and broadcast views. Integrations and output adapters consume that shared state.

## Starting, stopping and recovering

A fresh process starts stopped, with outputs disarmed, no subtitle, and the authored local sample selected. An operator must use `start` before the character speaks or acts. A restored snapshot also starts stopped on that sample, even when the previous session was running. It restores validated settings, bounded history, monetary aggregates and cost reservations; it discards pending polls/games, visible sponsorship, external playback, stale platform status and speech. Malformed saved fields fall back to typed defaults, unsafe media URLs are discarded, and collections are bounded. Provider availability must be reported again by the server.

`stop` disarms output and cancels current speech and sponsor visibility. `voice_interrupt` clears the shared subtitle and increments the shared speech ID, allowing every connected output to cancel its current audio. `pause_ai` silences the character and blocks autonomous reactions; it is distinct from stopping the stream runtime.

`safe` / `safe_mode` cancels active games and polls, replaces external playback with the authored sample, disarms output and pauses AI. `start`, playback changes, reactions and audience activities are rejected while SAFE is active. Only explicit `resume` leaves SAFE. SAFE persists across process restarts.

`MANUAL` suppresses autonomous reactions and content rotation; operator controls remain available. `ASSISTED` permits event/chat reactions while leaving content rotation to the operator. `AUTOPILOT` also rotates cleared content and runs the event director. No mode grants browser screen-capture permission or starts an external KICK broadcast.

## Source, model and character boundaries

Source frames and `VisionEngine` features remain separate from the character. Visual ingestion uses inexpensive local motion, luminance, ON/OFF and frame-change features. Confidence, novelty, per-kind cooldown and an eight-second global visual-event cooldown gate reactions. Audio events represent amplitude peaks, not transcript understanding.

M0XA's feelings, comments, lore, habits and animation are fictional. Each decision records its triggering event, mood, action, reason, confidence, model, latency and reserved cost. Local decisions identify `local-rules`; they are not claims about the thoughts or neural recordings of a real fly.

The seeded event director has common, uncommon, rare and legendary events. Rare and legendary events require minimum gaps of 15 minutes and one hour. Its choices are repeatable given identical initial state and inputs; it does not synthesize viewers or audience responses.

## Content rights and playback

Queue playback requires an explicit permission assertion and `owned`, `public-domain`, `cc` or `licensed` rights. Creative Commons entries also require attribution. These are operator assertions, not automatic verification of a license. `unknown` entries cannot play. URL entries accept HTTP(S) without embedded credentials; local entries use the server upload path. Browser capture still requires the browser's explicit user chooser and a permitted source.

The queue records actual character reaction counts and clip timestamps. Those counters describe runtime actions, not audience enjoyment. Automatic rotation uses only eligible queue entries. The canonical authored sample remains available as the safe fallback.

## Chat, participation and moderation

Incoming messages are bounded, normalized and passed through a conservative local text gate. This gate is not comprehensive semantic moderation. Raw viewer or donor messages are never turned into character speech; supported chat commands select curated responses. Optional provider responses must carry server moderation approval and pass the local gate again at delivery time. SAFE, MANUAL, paused AI and stopped output continue to gate late responses.

Messages have a per-user 1.5-second interval. Ordinary character commands additionally obey configurable per-user cooldown and a global 2.5-second interval. Game/poll participation uses one attempt/vote per participant and collection caps. Free viewers have the same game scoring and vote weight as supporters.

- Polls accept only existing option IDs. Ties and polls with no votes have no winner.
- FIND FOOD accepts exactly 1, 2 or 3. A wrong choice is recorded as wrong; out-of-range choices are rejected rather than clamped into valid answers.
- REACTION TEST accepts `!react` only for the reaction game. Input before the actual green-signal transition loses. Recorded latency starts when the server emits the green state and includes network delivery; it is not a calibrated human reaction measurement.
- Real chat votes and attempts enter `realCounters`; local operator/demo participation enters `demoCounters`.

`delete_user` removes identifying viewer memory, messages, events, supporter entries, game entries and poll votes. Aggregate accounting remains. `pruneRetention(now)` removes viewer identities inactive for 24 hours and dependent references, and removes real chat/events at the 24-hour boundary. The server calls this method on its retention schedule; it is not an operator command. Saved data also follows the server storage policy.

## Support, sponsors and costs

DEMO and verified-integration event ledgers are separate. Currency amounts are stored separately, with no guessed conversion; the USD goal advances only from its configured currency. Subscription events are counts, not assumed subscription payout amounts. Tip accounting continues even if a tip is too small or too close to the previous tip to trigger an animation. Supporter text is never spoken.

A sponsor slot requires a running, armed runtime, enabled campaign, valid URL, active campaign dates and available frequency capacity. It waits for a speech opportunity and supplies the fixed disclosure “Реклама. Этот показ оплачен спонсором лаборатории.” alongside the explicit visual disclosure `ADVERTISEMENT · РЕКЛАМА`. Browser/server voice settings still govern whether the subtitle is audible; muted or mock output must not be represented as an audible impression. The visible slot ends no later than campaign end. Click tracking accepts only a currently visible active slot.

Sponsor `impressions` count scheduled local slots. They are not verified rendered impressions, viewers, unique users or proof that audio was heard. Disclosure must also be configured on the streaming platform when required; the local runtime cannot assert that platform setting.

Optional AI requests reserve spend before a provider call against hourly and daily caps. At 70% and 90% usage the budget state becomes `economy` and `sparse`; exhausted or absent providers use local rules. Reservations survive restarts. The server must use this reservation gate before chargeable calls and enforce any provider-side limits. The runtime's duplicate-event cache is bounded and in-memory; integration adapters are responsible for durable delivery deduplication across restarts.

## Content Director

`deriveContentDirector(state)` is a pure exported function returning `ContentDirectorReport`. It does not change state or run its proposed commands. The operator UI can display and explicitly apply the returned command when available.

It always returns three editorial suggestions in order:

1. Revisit a cleared segment, ranking its retained clip markers first and character reaction count second, with stable queue-order tie breaking. Browser captures are excluded because they require an operator chooser.
2. Run one bounded chat activity based on recorded real votes/attempts and retained real messages, or let an existing activity finish.
3. Review the highest-scoring retained clip marker, or observe a complete segment when no marker exists. A marker is metadata, not an exported video or a demonstrated viral moment.

Each suggestion includes `id`, `order`, `title`, `reason`, `durationSeconds`, `evidence` (`OBSERVED` or `INSUFFICIENT_DATA`) and `command` (`FlyCommand` or `null`). The report exposes separate real/demo retained chat counts, retained real participants and clip markers, and runtime counters for real votes/attempts. Its caveat explains the bounded sample.

Retention, average watch time, returning viewers, revenue per viewer and subscription revenue are explicitly `null`. No watch-session, payout or attribution data is connected to this function. It does not infer causal performance from a character action, subscription event or present viewer count.

## Limits and verification

The retained state caps events at 160, decisions at 100, chat at 80, viewers at 200, clip markers at 100, queue items at 40 and poll/game participants at 200. Per-content moment history, session memory, supporter history and duplicate/cooldown maps are bounded too. Snapshots are detached clones.

`npx tsx --test tests/brain.test.ts` exercises 23 deterministic cases: cold start, SAFE, license gates, autonomy, visual thresholds, chat limits, real/demo accounting, money currencies, polls, both games, erasure, two-hour bounded director behavior, AI caps, marker semantics, sponsor disclosure/caps, silent restart, corrupt snapshots, exact game choices, actual signal timing, shared voice interrupt, retention and evidence-only recommendations. Browser rendering, real OAuth/webhook delivery, audible TTS, OBS and paid provider behavior require their own integration checks; these unit tests do not claim to establish those outcomes.
