CognitiveTwinXR Room 110 Equipment v9
Read ROOM-110-START-HERE.md for this update, deployment and examples.

Prior version notes (retained for background):
CognitiveTwinXR BFH — Local Voice v8

DEPLOY: Extract this ZIP and upload its contents to your HTTPS static host.
index.html is at the root. No build step or separate backend is needed.
Default BFH geometry and replacement IFC uploads are included.

SYSTEM PROMPT: Edit ai-config.js beside index.html. Reload after changing it.
The prompt applies to both webpage and AR chat. For temporary changes, open
webpage chat > System prompt. Reset returns to the ai-config.js default.
Retain grounding/sensor-source instructions if you want evidence-based answers.
Groq model and API key settings on the webpage also apply in AR.
The previously authorized test key remains embedded in index.html and is public.

AR CHAT: Enter Tabletop AR, turn the left palm up, select MENU, then AI chat.
Use controller ray + trigger/pinch or right index fingertip to press keys.
The virtual keyboard includes letters, numbers, Shift, Space and Delete.
Send submits; Stop cancels. Back/Next pages through the latest question/answer.
Ask about this floor prepares a question using your selected floor.
Webpage and AR share conversation context. Full chat and tool evidence are on
webpage. Hide retains the panel location; Move panel / Lock panel repositions it.
The panel stays stationary by default. It does not follow the user.

See VOICE-README.txt for the new local voice controls and validation.

VALIDATION: Synthetic controller/fingertip keyboard submission, stationary
panel, floor selection, shared assistant tool execution and editable prompt
checks passed. Actual Quest 3 hardware testing has not been performed.

SOURCE: Authored viewer files are in source/. Install source/package.json
and esbuild to rebuild with node build.cjs. Copy source/dist/viewer.html to
root after building. Root assistant.mjs, ai-config.js, query-tools.mjs, and
CSS are directly editable; no build needed. Tests in source/ use Node.
Sensor readings are simulated unless explicitly provided through the test input.
Only IFC information exported into the viewer is available to the assistant.
