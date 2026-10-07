# Operations

Use Node.js 24, `npm install`, then `npm run dev`. Frontend: `127.0.0.1:5173`; backend: `127.0.0.1:8791`. Open `/control`, explicitly Start demo and inspect `/stream`. Ctrl+C stops both. Restart restores stopped/unarmed context; review content before starting. Frontend build/preview does not replace APIs.

The backend loads private `.env.local` and `.env` files; existing process environment values take precedence. Copy `.env.example` to `.env.local` or set PowerShell `$env:NAME` before launch. The local Vite proxy targets port 8791; update its target if you change `PORT`. Secrets never belong in `VITE_*`, git, URLs or browser settings. `PORT`, `TRUSTED_ORIGIN`, optional `DATA_DIR` configure the service.

[KICK](KICK.md) explains OAuth/scopes/public HTTPS webhook setup. Outbound chat needs explicit server configuration and armed eligible output. Do not expose local operator APIs as a public authenticated production control plane.

Optional AI needs `AI_ENABLED=true`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_MAX_REQUEST_USD`. Optional speech needs `TTS_ENABLED=true`, `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_MAX_REQUEST_USD`. Use compatible providers and conservative reservations from current pricing. AI/server voice share Settings hour/day budgets. Reservations retained after errors are estimates, not invoices. Missing configuration leaves local/browser fallbacks available.

Use one intended speech-producing surface; test OBS mixer/recording for speech and duplicates. Browser/system voices vary; subtitles continue on failure. Interrupt, mute or select subtitles-only mock mode as needed. Capture relay/vertical recordings have no audio. Capture requires browser permission, actual-content rebroadcast rights confirmation and an open operator tab.

MANUAL disables autonomous reactions; ASSISTED reacts under operator programme control; AUTOPILOT advances approved media and schedules events. Pause AI stops automatic character output; Stop disarms it. Emergency Safe Mode replaces external content, cancels speech/provider work and suppresses external actions while keeping the scene shell. Resolve errors in Debug before explicit resume. Browser/WebGL faults may still require reopening; unattended reliability is not guaranteed.

Health exposes integration state, available processing metrics, estimated costs and errors. Missing metrics stay unavailable. Inspect browser console and bounded `data/runtime.ndjson` logs. Failed providers leave local rules running. KICK disconnection does not establish channel offline status.

`data/state.json` contains bounded context, queue/counters and short-lived viewer associations, without OAuth credentials or raw webhook payloads. Real chat/events/viewer memory are pruned to roughly 24 hours at persistence boundaries; real supporter identities are excluded from persisted supporter records. State older than 30 days is not restored. Data/uploads are git-ignored; review OS permissions, backups and media separately.

Audience's **Forget viewer** erases stored associations, not upstream KICK records or old backups. For a full local reset, stop services and remove the explicitly configured data directory after preserving needed media; verify the exact target first. Browser-local clip blobs disappear on page close unless downloaded; downloads/backups need separate erasure.

Before public broadcast check content rights/attribution, composition, audio, demo labels, absence of operator UI, safe mode and OBS settings. See [Streaming](STREAMING.md) and [Compliance](PLATFORM_COMPLIANCE.md). Transcription, semantic vision, real cash processing and automatic publication are not delivered.

