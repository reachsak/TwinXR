CognitiveTwinXR — BFH + Groq Assistant v6
Developed by Reachsak Ly — https://reachsak.github.io/

DEPLOY
Upload the contents of this ZIP to your HTTPS static host. index.html is at root; no build needed. BFH loads by default. Open another IFC processes a replacement locally. Serve over HTTP for local desktop testing: python3 -m http.server 8080. XR needs a supported HTTPS device/browser.

WRIST MENU
Panel starts hidden. Palm-up left hand exposes MENU. Tap with right index or use ray/select. Panel remains fixed by default and stays there when hidden/reopened. Move panel enables temporary head-relative repositioning; Lock panel fixes it again. Other building, floor and sensor controls remain. World placement lasts for the current session.

WEB AI ASSISTANT (not inside immersive AR)
Click Ask CognitiveTwinXR. Groq model & connection lets you refresh available account models and select or type a model ID. Select a text/chat model that supports function calling; the endpoint can also list unsuitable audio/other models. Default: openai/gpt-oss-20b, subject to account availability.
The supplied test API key is embedded in index.html as requested. Static browser code cannot hide this key. You can replace the key in the connection field for the current session or edit index.html for deployment.
Only when you ask a question, the assistant sends chat and selected IFC tool results to Groq. It does not send mesh geometry. Properties and room readings can be included. Expanded Evidence entries show the exact local tool outputs. No backend server is required. Groq usage/rate limits apply.

QUERY TOOLS
Overview: actual exported floors, category counts and per-floor counts.
Elements: exact counts, filter by category/floor/ID/text, paginated results and optional exported properties.
Sensors: room-filtered snapshots, timestamps, source, stale flag, and units.
Examples: How many doors/windows on Level 2? List the floors. What properties exist for element 123? What is the temperature in room X? Which materials are documented for this wall?
The assistant is read-only; no equipment or model modifications. Data not exported cannot be answered reliably. Visual material presets are inferred and are not actual material specifications. Sensor readings are simulated unless external readings have been supplied. AI output can be wrong; check the evidence.

SOURCE
source/ includes viewer sources, tests and build config. npm install and npm run build within source rebuilds source/dist/viewer.html (directory included). Copy that file to deployment root. assistant.mjs, query-tools.mjs, assistant.css and other root loading files are editable directly. Tests expect dist/model.json; copy the root model.json there to run test-query.mjs.

VALIDATION
Build/syntax checks and synthetic XR tests passed. BFH per-floor door/window counts, pagination, unknown floor rejection and room readings were checked. Physical Quest 3 and browser-to-Groq CORS behavior require on-device verification.
