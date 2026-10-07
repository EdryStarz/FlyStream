# FlyStream Lab — M0XA

M0XA (Мокса) is a fictional virtual fly streamer living in the existing Three.js laboratory. The working local MVP watches media, derives visual signals, animates and speaks, responds to chat/platform events, runs polls and two scored mini-games, and marks clip candidates. The scientific workbench remains at `/science`.

**What the fly sees / what the model predicts / what the character says are distinct layers.** Personality, thoughts and voice are entertainment, not real biological consciousness or measured neural activity.

## Run

Use Node.js 24:

```powershell
npm install
npm run dev
```

Open [Control Room](http://127.0.0.1:5173/control). Frontend: **5173**; loopback backend: **8791**. Startup is stopped and silent, including after saved-state restoration.

1. Click **Start demo**. Authored moving-grating video plays on the monitor; model signals drive moods, animations and subtitles.
2. Chat accepts `!dance`, `!food`, `!brain`, `!mood` and labelled demo subscription/tip controls, with cooldowns.
3. Events provides polls, Find Food and Reaction Test. Clips offers markers and explicit recording.
4. Settings provides voice, volume, interruption and cosmetics. Browser speech prefers an available Russian system voice and may require a user gesture. Subtitles continue if speech fails.
5. Open [Stream Output](http://127.0.0.1:5173/stream) or [Debug](http://127.0.0.1:5173/debug).

Demo requires no accounts or paid keys. Start demo does not publish a KICK broadcast.

## Content, KICK and OBS

Queue built-in material, local videos/images or HTTP(S) media. Declare ownership/license, attribution and rebroadcast permission; unknown/unapproved items cannot autoplay. Declarations do not verify licenses. Capture uses the standard browser chooser and requires rights confirmation for actual selected content. Keep the operator tab open: its relay supplies up to three frames/second without audio. An embedded KICK player cannot feed pixels to the model.

MANUAL disables autonomous reactions. ASSISTED permits reactions under operator programme control. AUTOPILOT advances approved content and schedules bounded events. Emergency Safe Mode silences/disarms output and replaces external content with authored fallback; explicit resume is required. Unattended 24/7 reliability has not been established.

[KICK setup](docs/KICK.md) covers official OAuth, signed webhooks and optional outbound chat. Configure server environment using [.env.example](.env.example); never place secrets in `VITE_*`. Without credentials the demo adapter remains active. A real authenticated KICK connection has not been tested in this delivery.

Optional text AI uses `AI_ENABLED`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_MAX_REQUEST_USD`. Optional server speech uses `TTS_ENABLED`, `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_MAX_REQUEST_USD`. Set process environment before launch; see [Operations](docs/OPERATIONS.md). Local rules require no paid provider. Reservations estimate cost, not invoices. Transcription and semantic vision are not implemented.

Add `http://127.0.0.1:5173/stream` to OBS as a 1920×1080 Browser Source; see [Streaming](docs/STREAMING.md). OBS owns RTMP encoding and the stream key. Browser speech availability/audio routing varies in OBS: test its mixer and recording, using configured server TTS or browser/desktop audio capture when necessary. Relay/vertical recording contain no audio. No external broadcast or clip is automatically published.

## Scope and verification

Markers suggest −20/+25-second windows; they do not record automatic pre-roll. Explicit 9:16 recording makes complete roughly 30-second, 720×1280 video-only WebM segments. The last three remain browser-local with a 16 MiB per-segment bound (about 48 MiB total). Downloads are independent of markers.

Demo/real ledgers and currencies remain separate. Subscriptions are event counts, not guessed revenue. Sponsor counters are local AD slot displays, not viewers. Retention, average watch time and revenue/viewer remain unavailable. Real cash processing needs a payment-provider integration.

`npm test` runs implementation tests; `npm run build` type-checks/builds frontend. `npm run dev:web` and `npm start` run separately. `npm run preview` serves frontend only; APIs still need the backend. See [Verification](docs/VERIFICATION.md) for existing QA scope.

[Architecture](docs/ARCHITECTURE.md) · [Fly Brain](docs/AI_BRAIN.md) · [Monetization](docs/MONETIZATION.md) · [Compliance](docs/PLATFORM_COMPLIANCE.md) · [Research](docs/RESEARCH.md)

## Science and attribution

`/science` retains SOURCE pixels, MODELLED optical/temporal transforms and INFERRED dimensionless features on VFB anatomy. MEASURED neural activity is unavailable. Schematic fly geometry and anatomy do not supply functional weights, calibrated firing rates, UV recovery or subjective perception. Real Fly remains equipment-dependent, without tracking or neural recording.

SWC anatomy: Nern et al., Virtual Fly Brain, JRC_Optic-Lobe v1.0.1, CC-BY 4.0; JRC2018Unisex registration, roughly traced skeletons. [Publication](https://doi.org/10.1038/s41586-025-08746-0). Non-distributed region meshes have separate CC-BY-NC-SA 4.0 terms. See `docs/vfb-provenance.json` and `public/data/neurons.json`. IBM Plex: SIL Open Font License (`public/fonts/LICENSE.txt`). Synthetic stimuli/sample are project-authored.
