# Verification — FlyStream Lab

Streamer MVP checks: 7 October 2026. Earlier scientific checks below: 19 September 2026. VFB retrieval: 16 September 2026.

## M0XA streamer MVP — 7 October 2026

- All **50 tests** pass: 23 brain/runtime tests, 18 server/platform tests, eight scientific tests and one late-TTS cancellation test. Production TypeScript/Vite build passes; the Three.js shared chunk still raises Vite's size advisory.
- Real Edge browser QA passed **21 checks**, recorded in `docs/streamer-results.json`: moving decoded source pixels, computed retina, shared 3D moods, moderated chat and cooldowns, separate demo/real money, actual poll/game votes, rights-gated local upload with measured duration and credit, same-item replay, cross-route capture relay and ended-source fallback, shared voice interruption, emergency safe mode and preserved six-VFB science view.
- An exported vertical WebM was actually decoded at **720×1280**. It contains video only; clip markers are separate metadata and do not claim automatic pre-roll extraction.
- Desktop control room (1440), clean OBS output (1920×1080), and all control panels at 390/320 pixels were exercised without unexpected JavaScript errors or horizontal document overflow. Fresh visual review additionally found crowded mobile navigation/transport; these were repaired with intact scrolling navigation and two-column, at least 44px transport controls. `scripts/streamer-layout-qa.mjs` verifies their geometry.
- Three bounded headless output samples observed **17.8–28.6 fps**, 75 draw calls, 12,618 triangles and three canvases. JS heap varied around 31–52 MB. These observations do not certify physical-device performance, hours-long leak freedom, 24/7 operation or end-to-end broadcast latency.
- Source/public/build scans found no recognizable private key or credential literals, and no server-secret variable references in client/public/build output. HTTP tests also verify sanitized state and OAuth responses. Scanning is a bounded check, not proof against every possible secret format.
- KICK signing/OAuth/token refresh, AI budget tiers and TTS budget/cancellation were tested with controlled provider fixtures. Real authenticated KICK, paid AI/TTS, OS voice audibility and OBS/RTMP transmission remain unverified without credentials and external setup. Native capture success below belongs to the earlier scientific app; streamer relay checks used explicitly authored capture fixtures.

Reproduce: `npm test`, `npm run build`, `node scripts/streamer-qa.mjs`, `node scripts/streamer-layout-qa.mjs` with `npm run dev` running. The scientific browser scripts now target `/science`.

## What was tested

- Production TypeScript/Vite build and eight meaningful scientific/service unit tests.
- Playwright with real Edge rendering: 1440px desktop, 390px mobile; targeted 320px verification. No horizontal overflow in tested states; no application JavaScript errors.
- Source pixels and retinal pixels change, compared using SHA-256 over actual canvas data. A prior weak checksum collided for periodic gratings; SHA-256 eliminated that test defect.
- Pause freezes both images. Stage changes render actual computed buffers. Paused sample/file seeks publish new readouts and reset temporal history. Paused parameter changes and model reset update sampling immediately.
- Actual decoding of a locally encoded WebM. Built-in generated stimulus remains available without external network access.
- Permission rejection and stopped-track recovery with explicit test MediaStream fixtures.
- **Native `getDisplayMedia` success**, without replacing the browser API: an isolated Edge process automatically selected only a separately created synthetic fixture tab using Chromium's test-only title-selection switch. The returned track identified a browser display surface; moving content changed luminance and feature drive. No existing user tab, desktop, camera or personal data was captured.
- LIVE/OFFLINE/UNKNOWN official-status adapter logic using clearly identified test payloads. These are not a claim that a live JesusAVGN broadcast was observed.
- Six VFB skeletons loaded in a common registered coordinate space. Individual identifiers, dataset, download URLs and five structural synapse counts were verified through the public VFB MCP API. Raw provenance and hashes are retained.
- Three-minute playback with source switching and GC-controlled heap samples: no errors; four canvases throughout; retained JS heap grew by approximately **0.84 MB** over the run. This bounded observation does not prove absence of all possible memory leaks.
- Steady-state sample processing observed around **25–29 fps**, approximately **4–7 ms compute time** on this machine across checks. Compute timing is not end-to-end streaming latency and is not a biological response latency.
- Independent dual-agent Impeccable critique/audit and final correction verdicts; zero deterministic detector findings. Source labels, plot scale, keyboard directions, evidence focus and 44px mobile buttons checked after fixes.

## 3D fly scene extension — 19 September 2026

Production build and all eight unit tests pass with the new scene. `docs/fly-scene-results.json` records an Edge browser check of moving source texture, frozen texture on pause, keyboard orbit, local WebM decoding, deterministic shared-video fixture, cleared screen after capture ends, and 390/320 px layouts with 44 px controls. The scene uses a fifth canvas in sample/file/capture mode; prior four-canvas soak figures above describe the pre-extension build and were not rerun for this extension. Rendering is capped at 30 fps and skipped offscreen or in a hidden document.

The model is actual procedural Three.js geometry with six segmented legs, two wings, eyes, antennae and a desktop computer. Pose and relative scale are illustrative. It copies existing selected-source pixels without changing the scientific engine. Live JesusAVGN content was not captured during these checks; its tab must be selected through the normal browser sharing chooser.

## Scope and remaining constraints

- The official Kick iframe is present, but external playback availability depends on Kick/browser/network. During automated captures it could remain blank; the app provides an Open Kick link and Share tab recovery. It does not label a blank or blocked player OFFLINE.
- A real JesusAVGN live broadcast/VOD was **not** captured in the tests. Normal use requires the user to choose the Kick tab in the browser chooser.
- Without supplied credentials/server, broadcast status is **UNKNOWN**, not fabricated LIVE/OFFLINE. The optional same-origin official-status adapter is implemented and tested; no authenticated provider is configured.
- SOURCE is input/anatomy, MODELLED is the retinal transform, INFERRED is the feature response. No MEASURED neural time series is connected.
- The feature overlay is not a fitted prediction for each displayed neuron; structural synapses do not supply functional weights. RGB cannot supply UV or exact receptor excitation.
- Real Fly currently provides the experimental-mode explanation and typed pose/calibration adapter contract. Camera tracking, calibrated arena geometry and real neural acquisition require additional implementation and hardware/data. They are not presented as working measurements.
- Not certified: full WCAG compliance, screen-reader speech, physical mobile devices, every browser/codec, hours-long leak freedom, or physiological prediction accuracy.

## Reproduce

`npm test`; `npm run build`; `node scripts/browser-qa.mjs`; `node scripts/native-capture-qa.mjs`; `node scripts/soak.mjs`; `node scripts/review-verdict.mjs`.

Reports are in `docs/*results.json`. Final screenshots are in `.impeccable/review/`. Keep `npm run dev` running for browser checks.
