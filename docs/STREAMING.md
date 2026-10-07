# Broadcast setup

Official KICK encoder guidance checked **7 October 2026**. The application renders a scene; OBS (or another encoder) captures it and sends the actual RTMP/RTMPS stream. The Node server is not an encoder and never needs your stream key.

## Local rehearsal

1. Run `npm install`, then `npm run dev`.
2. Open `http://127.0.0.1:5173/control`. Start the runtime explicitly. The authored sample, synthetic stimuli, character reactions, local chat, polls and event director work without API keys.
3. Open `http://127.0.0.1:5173/stream`. This is the clean output route. `/debug` exposes decisions and `/science` retains the original scientific workbench.
4. For a build, run `npm run build` and `npm start`; use `http://127.0.0.1:8791/control` and `/stream`. The same server owns state and serves `dist`.

All output browsers follow one server brain over SSE, avoiding competing autonomous timelines. A reconnect receives a current snapshot. Restarting the server stops output until the operator starts/resumes it. The local media route supports byte ranges so OBS and browsers can seek uploaded video.

## OBS Browser Source

Create a scene and add Browser Source using `http://127.0.0.1:5173/stream` in development or `http://127.0.0.1:8791/stream` for the build. Set width **1920**, height **1080**, and a sensible render frame rate (start at 30). Keep the source alive when switching scenes if uninterrupted playback is needed. Check [OBS Browser Source documentation](https://obsproject.com/kb/browser-source) for the current controls.

The control room belongs in your ordinary browser, not the broadcast composition. Use the source's Interact window if Chromium needs an audio gesture. Browser speech voices vary by machine and OBS's Chromium runtime; audition the actual OBS source before going live. If browser TTS is unavailable there, use a dedicated browser/window capture with system audio or configure the optional [server speech adapter](KICK.md#optional-paid-providers). Avoid monitoring both the control preview and output audio simultaneously. Browser speech is the default; a server provider needs its own credentials and budget configuration and has only been tested here with deterministic fixtures.

For tab/desktop capture, initiate capture from the control browser using its source picker and permission attestation. The local bridge sends JPEG snapshots at a low rate; it is an economical visual observation path, not a full frame-rate/audio rebroadcast. It carries no captured audio. Use your properly licensed original media and OBS audio/video sources for high-quality source playback. KICK content additionally requires compliance with its official-embed rule; a streamer's permission alone does not replace KICK's written permission to use another display system. Keep private windows, notifications and credentials off any captured surface. See [Developer Agreement](https://dev.kick.com/terms-of-service).

## Connect OBS to KICK

Copy the server URL and stream key from your KICK Creator Dashboard → Channel → Stream URL and Key. Put them in OBS Settings → Stream using the current KICK-supported service/custom settings. Set stream title and category in the dashboard. Keep the key inside OBS or a secret manager; never commit it, paste it into the control room, place it in a browser source URL or print it in logs. [Official KICK setup](https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com).

Current documented limits are:

| Setting | KICK requirement / documented setting |
| --- | --- |
| Encoder | x264 or H.264; H.265 unsupported |
| Rate control | CBR |
| Video bitrate | 1,000–8,000 kbps; choose a stable value your connection supports |
| Maximum output | 1920 × 1080, 60 fps |
| Keyframe interval | 2 seconds |
| Audio | Stereo, at most 48 kHz |

The setup and troubleshooting pages are the source of these settings; recheck before a public broadcast. [Setup guidance](https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com), [connection requirements](https://help.kick.com/en/articles/14994318-obs-or-streamlabs-not-connecting-to-kick).

## Rehearsal checklist

- Confirm SOURCE / MODELLED / CHARACTER labels and the DEMO indicator are readable at the actual output resolution.
- Test local video playback, seeking, the fly monitor, visual reactions, one chat command, a poll and a mock subscription. Check a marker appears in Clips.
- Verify TTS in OBS itself, volume, captions, interrupt and audio routing. No captured source audio is implied by the JPEG bridge.
- Test Emergency Safe Mode: external media/capture and speech should stop while a safe scene remains. Resume explicitly; verify the next item has broadcast permission.
- Watch OBS Stats for render/encode lag and dropped frames. Reduce scene frame rate or output resolution if needed, and check the in-app processing/FPS diagnostics on the actual computer.
- Leave a moderator/operator able to intervene. Do not assume a browser's successful local rehearsal verifies encoder stability or a public KICK transmission.

Clips stores candidate timing/context metadata. Recording/export support in the control room requires an actual browser capture and cannot recreate footage from before recording began. A marker alone is not a video file. Publishing to third-party accounts is not automatic.

For multistreaming, add an encoder/distribution layer after the shared scene and follow your current KICK program terms; do not add stream keys to frontend configuration. Read [platform compliance](PLATFORM_COMPLIANCE.md) before enabling paid partnerships or additional destinations.
