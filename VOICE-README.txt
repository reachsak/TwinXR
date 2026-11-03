CognitiveTwinXR — Local Voice v8

DEPLOY
Extract all contents to your HTTPS host (GitHub Pages or Vercel).
index.html is at the root. No build or speech API key needed.
Groq remains the online text assistant; your existing test key is retained.

USE
1. Open Ask CognitiveTwinXR > Local voice > Enable voice.
2. Allow microphone access. Wait for Whisper Tiny English to load.
3. Tap Talk, speak, then Finish. Recording stops at 20 seconds maximum.
4. Review/edit the transcript, then Send to query the building.
5. Replies are read aloud when Speak new replies is on. Read reply replays.
Kokoro loads on first speech output. First downloads can take a while.
Stop voice ends recording/playback/inference and unloads the speech worker.
Use Enable voice afterward; cached weights may be reused.

AR
Enable voice on the webpage BEFORE entering Tabletop AR so microphone
permission can be granted normally. Open palm MENU > AI chat.
Enable voice, Talk/Finish, Read reply, Stop voice and Auto on/off are present.
Transcription appears in the same question field as the virtual keyboard.
Press Send yourself. Panel placement and existing floor controls are unchanged.

LOCAL INFERENCE
English only in this prototype. Whisper tiny.en, q8, via Transformers.js 3.8.1.
Kokoro 82M q8, af_heart voice, via kokoro-js 1.2.1.
Both run in a dedicated worker using single-thread WASM. No WebGPU or
cross-origin isolation headers required. No speech inference server.
Model weights download from Hugging Face on demand; browser caches may be
cleared or evicted. Internet is still required for Groq and uncached assets.
The ZIP bundles the speech runtime, not the model weights.
Microphone recordings are held only in memory and are not sent to Groq.
The transcript and retrieved model context reach Groq only after Send.
Spoken output is limited to the first 1,600 characters; full text remains.

VALIDATION
Real browser WASM test: Kokoro generated a sentence and Whisper correctly
transcribed that audio. The test environment proxied static weight downloads;
all inference ran in Chromium. Voice controls, microphone cleanup, explicit
Send and AR button wiring also passed automated tests.
Quest 3 performance and microphone behavior in actual immersive AR have NOT
been verified on hardware. Text/keyboard remain available on speech failure.

EDITING
System prompt: ai-config.js, shared by webpage and AR chat.
Voice UI/capture: voice.mjs and voice-capture.js at ZIP root.
Model settings: source/voice-worker.js. From source/, npm install, then
npm run build:voice. Copy its dist/voice-worker.mjs and dist/vendor/voice to
root after rebuilding. Existing viewer: npm run build, copy viewer.html.
Voice weights are external model dependencies; retain their model licenses.
