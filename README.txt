TwinXR BFH Tabletop v4

Upload these ZIP contents directly to your HTTPS static host. index.html is at the root. No build step required. BFH opens automatically; Open another IFC replaces it locally.

In Quest Browser choose Tabletop AR. The complete model appears automatically about 85 cm across, in front of and below your eyes. A floating 3D panel has Floors, Model, and Sensors tabs. Floors provides a two-column selector with paging; Model provides scale, rotation, height, placement and recenter controls; Sensors provides direct heatmap selection. Selected controls have teal highlights; controller/hand-ray hover highlights each button. Exit AR is always available. No DOM overlay is required.

Aim either controller at a button and pull the trigger. With tracked hands, use the system hand ray and pinch (WebXR select events). Hold trigger/pinch away from buttons and move your hand to translate the model; release to stop. Controller grip also moves it. Thumbstick horizontal rotates, vertical scales. The panel has equivalent rotation/scale buttons for hands. Two-hand stretch is not implemented.

Place on surface is optional: look toward a detected surface, then trigger/pinch away from the panel to confirm the ring location. Otherwise the model remains visible in free space. Recenter moves the model and panel back in front of you.

Floors use IFC spatial assignments. Heatmaps require usable IFC spaces. Simulated readings are not live sensor measurements. Enhanced finishes are illustrative.

Validation: bundled build and automated session/transform/floor/scale/exit/reentry tests passed. Physical Quest 3 and hand tracking were not hardware-tested here.

Editable source is in source/. npm install then npm run build rebuilds source/dist/viewer.html; copy that viewer.html to the deployment root. Other deployment files are authored directly.
Developed by Reachsak Ly — https://reachsak.github.io/
