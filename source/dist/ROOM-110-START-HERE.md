# CognitiveTwinXR — Room 110 equipment demo (v9)

## Deploy
Extract the ZIP and upload its CONTENTS to GitHub Pages or Vercel. index.html is at the root. No build step or additional server is needed. HTTPS is required for microphone and WebXR. This release extends Local Voice v8 and retains the BFH model, IFC replacement, configurable system prompt, Groq model selection, local voice, and stationary wrist-menu tabletop AR.

## Demonstrate
1. Open the site and let BFH load.
2. Click **Room 110 · Equipment** in the viewer toolbar. This opens a Level 1 cutaway of Lab1 (IFC space 110).
3. Use the four sliders, on/off buttons, **All to level 7**, or **All off**.
4. Open **Ask CognitiveTwinXR** and try:
   - Turn on all equipment in Room 110 at level 7.
   - Set the AC in Room 110 to level 9 and dim the light to level 3.
   - Turn off the humidifier in Room 110.
   - What are the equipment levels and simulated readings in Room 110?
   - Turn off everything in Room 110.
5. In tabletop AR, open the wrist menu and select **Devices**. Tap a device card to toggle it; use −/+ to change its level. The existing AI chat/voice controls use the same command handler.

Level 0 is off. Levels 1–10 set visual intensity/performance. Turning on restores the last nonzero level, defaulting to 5. State resets when you reload. Changes are applied immediately when an AI tool call is received; the evidence drawer shows the returned state. Chat needs a working Groq key and a tool-capable model. Manual controls work without AI connectivity.

## What changes
- Light bulb: emissive bulb, warm point light and a floor light pool; brightness rises with its level.
- AC: green status ring and animated blue airflow; higher levels accelerate airflow and lower simulated temperature gradually.
- Purifier: green status ring, spinning fan and clean-air particles; simulated PM2.5 falls gradually. It does not claim CO2 removal.
- Humidifier: illuminated status ring and rising mist; simulated relative humidity increases gradually.
- Off devices: dark indicators, stopped fans/particles; light extinguishes.

Temperature and brightness from this equipment simulation also feed Room 110's existing simulated sensor cards/heatmaps. External readings, if supplied, remain untouched; equipment response readings stay separately labeled. PM2.5 and humidity are displayed in the equipment panel and available to AI.

## Scope
These are representative demo models, positioned within the real IFC room envelope, not verified installed assets. Responses are illustrative, not a calibrated HVAC/lighting/air-quality calculation. No real actuator, HVAC or IoT endpoint is connected. Only the original BFH space Global ID 1HDi68K_f8gwn3MDKYIP$L is enabled; replacement IFC files do not silently inherit control of a similarly named room.

## Source and later integration
- equipment-state.mjs: shared command validation, state and AI tool definitions.
- source/equipment.js: device models, visual feedback, controls and illustrative room response.
- assistant.mjs: Groq tool dispatch shared by webpage, voice and AR chat.
- ai-config.js: editable system prompt; instructions explain supported controls.
- source/app.js and source/sensors.mjs: model integration and protected simulation hook.

For real controls later, replace the simulated command adapter with an authenticated backend and device acknowledgements; never use animation state as confirmation of physical equipment state.

To rebuild the viewer: install source/package.json dependencies, then run npm run build inside source; copy source/dist/viewer.html to the deployment root. All compiled files are already supplied.

## Checks performed
State validation (on/off, restore previous level, 0–10 limits, unsupported room/model), external reading preservation, and mocked XR wrist/controller interaction passed. Chromium loaded the BFH model with no page errors; Room 110 controls and a mocked Groq tool-call round trip changed device state and UI. Live Groq inference, microphone inference and physical Quest hardware were not retested in this update.
