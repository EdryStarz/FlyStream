# KICK integration

Official sources checked **7 October 2026**. Live authorization, webhook delivery and posting were not exercised: this workspace has no supplied KICK application credentials. No scraping or undocumented API is used.

## What works without an account

`npm install` and `npm run dev` start the local server and UI. Open `http://127.0.0.1:5173/control`, then start the demo. Mock chat, follows, subscriptions and tips remain marked DEMO. They do not post to KICK or change real revenue. The runtime starts stopped, including after a restart.

The Node process owns the brain. All browser outputs subscribe to the same `/api/events` state feed. The real adapter is dormant without credentials. The demo is a local broadcast rehearsal; starting it does not start an RTMP stream.

## Connect an application

1. Register an application in [KICK Developer](https://dev.kick.com/). Configure the redirect URI and webhook URL in its settings, following the [official app setup](https://docs.kick.com/getting-started/kick-apps-setup).
2. Copy `.env.example` to `.env.local`. Set `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`, `KICK_BROADCASTER_ID`, and `KICK_REDIRECT_URI`. The default callback is `http://127.0.0.1:8791/api/kick/callback`; it must match the registered value exactly. Keep the operator URL on `127.0.0.1:5173`. The adapter includes KICK's documented `127.0.0.1` redirect workaround; `localhost` is also supported when registered and configured consistently.
3. Restart the server. Use Connect KICK in Settings. The browser follows the URL returned by `POST /api/kick/connect`; the callback exchanges the code on the server. Authorization uses PKCE S256 and an unpredictable, single-use state with a ten-minute expiry. Tokens remain in process memory. Restart requires reconnection, unless tokens are provided in the server environment. [Official OAuth flow](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow).
4. Register a public HTTPS webhook endpoint ending in `/api/kick/webhook`. A reverse proxy/tunnel must expose **only that exact route**, forwarding it to `127.0.0.1:8791`; keep the control room, state, media, uploads and AI endpoints private. If using an HTTPS OAuth callback, expose only the exact callback additionally.
5. Use Subscribe to events, which calls `POST /api/kick/subscribe`. It reads existing subscriptions and registers missing event names. Its response reports registration count; verify delivery in the developer portal. [Official subscriptions](https://github.com/KickEngineering/KickDevDocs/blob/main/events/subscribe-to-events.md), [current API schema](https://api.kick.com/swagger/doc.yaml).

`channel:read` supports a sanitized channel lookup; `events:subscribe` supports events. `chat:write` is requested only when `KICK_ENABLE_OUTBOUND=true`. The app never asks for `streamkey:read`, account email access, channel editing or ban permissions. A user token's broadcaster is inferred by KICK; configure `KICK_BROADCASTER_ID` to that same account. The server rejects incoming events for other broadcasters.

Optional `KICK_ACCESS_TOKEN` / `KICK_REFRESH_TOKEN` are server-only environment values. They are never serialized in state, logs, responses, generated links or the frontend. OAuth tokens acquired interactively are refreshed in memory as needed. Local disconnect clears them; revoke the app in your KICK account to revoke upstream authorization. Secrets must not use a `VITE_` prefix.

## Events and outbound chat

Signed chat, follow, new subscription, renewal, gifted subscription, moderation-ban and livestream-status notifications are decoded. Subscription notifications record counts, not guessed subscription revenue. KICKs are not converted to USD; third-party cash donation providers remain unconnected. Local polls and games are application overlays, not native KICK polls. [Official event payloads](https://github.com/KickEngineering/KickDevDocs/blob/main/events/event-types.md).

Every webhook verifies the base64 RSA PKCS#1 v1.5/SHA-256 signature over `message-id.timestamp.raw-body` before JSON parsing. The server fetches the signing key from [KICK's fixed HTTPS key endpoint](https://api.kick.com/public/v1/public-key), caches it for an hour, and refreshes after verification failure at most once per minute. Missing/unavailable keys fail closed; incoming requests cannot select a key URL. `KICK_WEBHOOK_PUBLIC_KEY` is an explicit server-side override for isolated fixtures or a reviewed deployment, not the production default. [Current official webhook security](https://github.com/KickEngineering/KickDevDocs/blob/main/events/webhook-security.md).

Timestamps must be within five minutes, bodies are capped at 256 KiB, and replay IDs are bounded to 20,000 entries with ten-minute expiry. IDs and resulting state are saved in one atomic write before acknowledgement, so immediate redelivery after a restart cannot double-count the real ledger. Failed persistence returns 503. These are application safety limits; they are not claimed as KICK's delivery guarantees.

Outbound replies require `KICK_ENABLE_OUTBOUND=true`, an authorized token, an armed running brain and a real event. Only moderated brain-generated text can be sent; demo messages never qualify. The adapter limits messages to one per fifteen seconds, suppresses duplicates and backs off on HTTP 429. Outbound text uses `POST /public/v1/chat` with `type: bot`, which posts to the channel attached to the token. [Official chat API](https://docs.kick.com/apis/chat).

## Operational boundaries

- This is a local single-operator application, not a multi-tenant service. Origin and Host validation protect local mutations from cross-site requests; they are not internet-facing user authentication.
- A server restart stops output, and unsigned webhooks cannot enter the real ledger. Keep the machine clock accurate for timestamp checks.
- KICK warns that repeatedly failing webhooks can be unsubscribed. Inspect registration and delivery after recovery; the application does not silently create new public subscriptions.
- Read [platform requirements](PLATFORM_COMPLIANCE.md) and [OBS setup](STREAMING.md) before broadcasting. API availability does not grant rebroadcast rights or promise partner eligibility.

## Optional paid providers

The demo uses local rules and browser speech without keys. To opt into external text generation, set `AI_ENABLED=true`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` and a positive `AI_MAX_REQUEST_USD` upper bound, then restart. The runtime reacts automatically only to recent interesting local visual/audio/director events while output is armed in Assisted/Autopilot. Cooldowns are 30 seconds in full mode, 60 in economy and 120 in sparse mode; local-only budget mode makes no paid call. No image frames, KICK messages or viewer identities are sent. Provider failure preserves local behavior.

For optional server speech, configure `TTS_ENABLED=true`, `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE` and `TTS_MAX_REQUEST_USD`, then select Server voice. The adapter uses an OpenAI-compatible `/audio/speech` API and accepts only the exact active, moderated character subtitle. Audio is bounded to 2 MB with a ten-second timeout; one line is cached in memory so repeat playback does not buy it again. Stop, safe mode, AI pause, voice mute, a changed line and client cancellation interrupt pending synthesis. The client falls back to browser speech/subtitles on failure. Paid TTS shares the AI hourly/daily budget; reservations stay charged after cancellation because an upstream provider may already have billed them. Prices/model/voice availability must be set from the chosen provider's current documentation; this build makes no live paid-provider claim.
