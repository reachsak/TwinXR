# IFC Twin Studio

Upload your own IFC and explore it as an interactive building digital twin.
Developed by Reachsak Ly — https://reachsak.github.io/

## Run the ready-built app

No npm install or build is needed. Unzip this project, open a terminal in its
folder, and run:

    python3 -m http.server 8080 --bind 127.0.0.1 --directory dist

Then open http://localhost:8080 and choose your IFC file.

**Do not double-click index.html.** This upload version uses a worker and a local
WebAssembly file, which browsers must load over HTTP/HTTPS. Unlike the earlier
single-model BFH HTML, this app needs the complete `dist` folder.

A desktop browser with WebGL, JavaScript modules, workers and WebAssembly is
required. No Autodesk account, API key, backend service or internet access is
required once the app's files are available locally.

## Deploy

Upload everything inside `dist` to a static host, keeping the vendor subfolder.
For Vercel: Other framework, no build command, output directory `dist`.
For GitHub Pages: publish `dist` contents using your Pages branch or workflow.
Serve `.wasm` as `application/wasm` and `.mjs` as JavaScript if your host requires
manual MIME configuration. Use HTTPS or localhost. Keep the worker, viewer and
vendor files on the same origin. No CDN dependencies are used.

## Model workflow

1. Choose or drop an uncompressed `.ifc` file (IFC2X3 or IFC4).
2. The browser reads the model and converts geometry in a background worker.
3. Open the full building, select levels, inspect IFC elements, isolate/hide
   items, use an overhead view, or move the horizontal section plane.
4. Use Appearance for enhanced materials, original IFC colors, lighting,
   shadows, edges, and transparency.
5. When usable IfcSpace geometry exists, select Spaces and choose a room for
   a floor cutaway, sensor readings and heatmaps.
6. Open another IFC to experiment with a different building.

## Privacy and limits

- The chosen file is processed in your browser and is not uploaded to a server.
- No model, sensor reading or edit is saved across reloads or shared with others.
- This is an experimental upload/viewer tool, not multi-user cloud project storage.
- Upload limit: 200 MB. This is a file-size guard, not a guarantee that every
  model below it will run smoothly. Geometry complexity and available browser
  memory matter. Start with a smaller building or discipline-specific export.
- Cancel stops the conversion worker. Unusual or unsupported IFC representations
  can be skipped; import notes report relevant conversion limitations.
- IFCZIP, IFCXML and native Revit RVT are not accepted. Export Revit to IFC first.
- Missing storeys produce an Unassigned group. Missing usable room geometry
  disables room heatmaps and sensor tools; no room boundaries are invented.
- The model's geometry uses metres after web-ifc conversion. Source storey
  elevations are converted using IFC SI or conversion-based units. Properties
  remain in their exported units, and cut heights are above the model's lowest
  point. Section faces are not capped. Multi-storey elements retain their IFC
  spatial assignment rather than being automatically split between floors.

## Sensor prototype

Initial temperature, CO2, brightness and occupancy readings are simulated.
Capacity is estimated from room geometry for the demo, not a code occupancy limit.
The slider adjusts numerical occupants across rooms; it does not create avatars.

Select a room, click Send a test reading, and apply the example JSON. Input overrides
simulation only for that space. All four metrics are required. Values are validated,
and an older external timestamp cannot replace a newer one. Readings are marked
stale after 30 seconds. Use simulated readings clears the override. The last 60
samples are retained in memory. Reloading clears all data.

The viewer runs in a same-origin iframe. From the outer page's developer console:

```js
const twin = document.getElementById('viewer').contentWindow.ifcTwin;
const room = twin.spaces[0];
twin.selectSpace(room.id);
twin.ingestSensor({
  spaceId: room.id, // IFC Global ID
  temperature: 22.8, // Celsius
  co2: 740,         // ppm
  lux: 460,         // illuminance
  occupancy: 8,    // integer people
  timestamp: new Date().toISOString() // optional; defaults to receipt time
});
console.table(twin.getReadings());
twin.resetSpace(room.id);
```

Inside the iframe, the same API is `window.ifcTwin`. An `ifc:sensor` CustomEvent
with the payload in `detail` is also accepted there. This is an in-browser input
contract, not a public HTTP endpoint. A future authenticated gateway adapter can
call it. Do not put private service keys in this static app.

## Visual quality

The viewer includes physical glass, sky reflections, stone/concrete/wood surface
variation, metal finishes, sunlight, shadows and exposure controls. Assignment is
inferred from IFC names, entity types and colors. It will not reconstruct every
Revit render material or automatically produce a photorealistic model. Finishes
are illustrative. Original IFC colors remain available. No geometry is designed
or added to replace missing building elements. The ground is a neutral backdrop.

## Source files

- `dist/index.html`, `upload.css`, `upload.mjs`: upload and loading interface.
- `dist/worker.mjs`: worker lifecycle and WebAssembly initialization.
- `dist/convert.mjs`: shared IFC extraction, units, properties and geometry.
- `dist/vendor`: pinned web-ifc 0.0.75 browser runtime and WebAssembly binary.
- `dist/viewer.html`: ready-built viewer; contains bundled Three.js and viewer code.
- `app.js`, `room-tools.js`, `sensors.mjs`, `materials.js`: editable viewer source.
- `template.html`, `style.css`: viewer layout and styling.
- `build.cjs`: rebuilds `dist/viewer.html`.
- `licenses`: dependency licenses.

To modify and rebuild the viewer:

    npm install
    npm run build

Upload-side files in `dist` are authored directly and need no build.

## Verification

The same conversion module used by the worker was checked with the BFH IFC:
1,745 building elements, 83 spaces, six levels, and FOOT-to-metre conversion.
A modified metric-unit fixture and invalid input rejection were also checked.
Syntax, local assets and interface references were checked. Browser interaction,
worker initialization in a real browser, and GPU rendering were not tested in
this session. Compatibility with every IFC exporter/schema variant is not assured.
Optional WebMCP tools are feature-detected; their browser registration was not
validated in a supported context.
