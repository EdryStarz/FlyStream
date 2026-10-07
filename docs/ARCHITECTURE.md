# Architecture

React streamer routes extend the existing Three.js fly and visual model; `/science` remains available. Frames produce optical/temporal, ON/OFF, motion, luminance and change features. Character reactions use numerical signals, without semantic scene recognition or neural measurement.

`src/stream/brain.ts` owns bounded state, queue, moderation/cooldowns, decisions, memory, events, games, local polls, markers, currency ledgers and sponsors. Decisions expose event, mood, action, reason, confidence, model, latency and cost estimate. Content Director derives three advisory suggestions from retained participation/clip evidence; unavailable retention/watch-time metrics remain null.

`server/index.ts` ticks the brain, accepts commands and shares state through server-sent events. `storage.ts` persists sanitized bounded state/logs in ignored `data/`; restoration stops/disarms output. `kick.ts` handles official OAuth/events and restricted replies. `ai.ts` optionally generates moderated text from numerical observations; `tts.ts` voices only the active moderated character line. Credentials remain server-side.

`client.ts`, `ControlRoom.tsx` and `StreamOutput.tsx` connect views. `voice.ts` supplies bounded priority speech, interruption, timeout and browser fallback. Local media is backend-served. Explicit capture relays up to three still frames/second without audio; the operator tab must stay open. Rights declarations cannot automatically establish rights for captured content.

`recorder.ts` composites a 720×1280 scene with name, context and subtitles into explicit complete WebM segments, retaining three bounded browser-local recordings. Independent markers suggest −20/+25-second windows; there is no pre-roll buffer or publishing service.

Cost governor reserves configured maximum request estimates before AI/TTS calls against hour/day budgets. Failed calls retain reservations because providers may bill them. Lower tiers space text requests farther apart; local rules continue. This is not a completed vision/audio pipeline.

OBS owns encoding/RTMP. Production authenticated remote control, cash-provider processing, transcription, semantic vision and sustained unattended operation need further implementation.
