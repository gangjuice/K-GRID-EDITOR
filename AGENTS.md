# K-GRID EDITOR

K-GRID EDITOR is a single-file desktop tool for tracking the electrical power-supply status of land parcels (필지/블럭) in a development zone, styled for KEPCO (한전) distribution work. The whole UI and logic live in one file, `index.html` (~1280 lines of HTML + CSS + inline JS): it renders an imported GeoJSON cadastral map through the Naver Maps Data layer, lets a user click parcels to set demand load (kW), supply rate, substation/line (변전소/배전선로) assignment, and transmission status, and reads/writes Excel through SheetJS. `main.js` is a thin Electron shell. There is no framework, bundler, test suite, or backend — changing behavior means editing `index.html`.

## Commands

| Action | Command |
|---|---|
| Run the app (dev) | `npm start` (= `electron .`) |
| Build Windows portable exe | `npm run build` (= `electron-builder --win portable`) |

No test, lint, or format scripts exist. CI ([.github/workflows/build.yml](.github/workflows/build.yml)) runs `npm run build` on `windows-latest` for every push to `main` and uploads `dist/*`.

## Project layout

| Path | Role |
|---|---|
| [index.html](index.html) | The entire app — HTML, CSS, and all JS (state, map, dashboard, Excel I/O) |
| [main.js](main.js) | Electron main process: starts an Express static server, then opens the window |
| [preload.js](preload.js) | Empty by design — see invariant 1 |
| [package.json](package.json) | electron-builder config (Windows portable only) |

## Critical invariants (DO NOT VIOLATE)

1. **The renderer has zero Node.js access.** `main.js` sets `contextIsolation: true, nodeIntegration: false` and points at an empty `preload.js` ([main.js:19-23](main.js#L19-L23)). `index.html` contains no `require`/`fs`/`process`/`ipcRenderer`. Do not reach for Node APIs in `index.html`; it runs as a sandboxed web page. To surface anything from Node, add a `contextBridge` in `preload.js` first.

2. **The window loads over HTTP, not `loadFile`.** `main.js` serves the repo folder with Express on a hardcoded port 8000, then loads `http://localhost:8000/index.html` ([main.js:7-11](main.js#L7-L11), [main.js:26](main.js#L26)). Keep this: switching to `win.loadFile` would serve from a `file://` (null) origin, which the origin-registered Naver Maps key at [index.html:6](index.html#L6) likely rejects (reason inferred, not documented in code). The server is never closed and the port is fixed, so a stale process or a port-8000 conflict makes the window fail to load.

3. **Parcel identity is the `blockName` string, not a stable ID.** Every read/write keys localStorage as `${currentProject}_parcel_${blockName}` ([index.html:452-453](index.html#L452-L453)), where the id comes from `feature.getProperty('blockName') || getProperty('zoneName')` ([index.html:618](index.html#L618), [index.html:649](index.html#L649)). The numeric `필지고유ID` shown in the dashboard/Excel is only the array index ([index.html:1132](index.html#L1132)) and is never used as a key. So renaming a block in the GeoJSON orphans its saved data, and two parcels sharing a `blockName` collide into one record.

4. **`currentProject` is the imported GeoJSON's filename.** It is set only inside `importGeoJson`, as the filename minus its extension ([index.html:1022](index.html#L1022)), and it namespaces every localStorage key (invariant 3). There is no project switcher; renaming the source file before reopening it silently hides all prior edits (they remain under the old name).

5. **One file, no build step.** All markup, styles, and logic are inline in `index.html`. Handlers are wired with ~70 inline `on*` attributes (56 `onclick`), so every handler must be a global named `function` in the single `<script>` block; there is essentially one `addEventListener` (the contextmenu blocker at [index.html:1281](index.html#L1281)). Map events instead use `map.data.addListener` ([index.html:617](index.html#L617), [index.html:648](index.html#L648)).

## Gotchas

1. **Offline-dead.** Two CDN `<script>` tags load core dependencies — Naver Maps (with a hardcoded key) and SheetJS xlsx ([index.html:6-7](index.html#L6-L7)) — and the map center/zoom is hardcoded to one specific zone ([index.html:443](index.html#L443)). With no network the map never renders and Excel I/O throws.

2. **Status codes are aliased and lossy across Excel round-trips.** Internal status is `1`=완료, `2`=미송전, `3`=무부하/해당없음, `99`=미입력 (the default for a new parcel), with `0` treated as a legacy alias of `2`. Export maps `2→0` and `3→-1` ([index.html:1126](index.html#L1126)); import maps `0→2` and `-1→3` ([index.html:1078](index.html#L1078)). There is no enum — these magic numbers are scattered (e.g. [index.html:550](index.html#L550), [index.html:654](index.html#L654)).

3. **Excel import reads a fixed set of Korean headers; computed columns are export-only.** `importExcel` reads only 블럭명, 송전상태, 수요예측(kW)/전체할당부하(kW), 공급률(%), 변전소명, 배전선로, 메모, 필지면적(m2) ([index.html:1076-1082](index.html#L1076-L1082)). The exported 공급완료부하(kW)/미송전부하(kW) columns ([index.html:1133](index.html#L1133)) are recomputed and never read back, so hand-edits to them are dropped on import.

4. **Dashboard and Excel silently dedupe by `blockName`.** Both skip any feature whose `blockName` was already seen ([index.html:1100](index.html#L1100)), so distinct parcels sharing a name vanish from the dashboard and the export with no warning.

5. **Load-calc and status-mapping logic is copy-pasted.** The area×rate load calculation and the status→export mapping are duplicated across `buildAndRenderDashboard`, `exportExcel`, `openEditModal`, and `onAreaChange` (e.g. [index.html:1114-1116](index.html#L1114-L1116), [index.html:1126](index.html#L1126)). Change one site and you must change them all.

6. **Packaging is Windows-only, and macOS has no reopen path.** `electron-builder` targets `--win portable` only ([package.json:11](package.json#L11)); no mac/linux target exists. `main.js` quits on non-darwin when all windows close but registers no `activate` handler ([main.js:33-37](main.js#L33-L37)), so on macOS closing the window strands a running app with no way to reopen one.

## Code conventions

- **UI and data are Korean.** UI strings, alerts, and many GeoJSON property names are Korean. Property reads use EN/KO fallback chains, e.g. `getProperty('blockType') || getProperty('용도') || getProperty('ZONE_NM') || "미상"` ([index.html:619](index.html#L619)) — follow this pattern when reading any new feature field.
- **State is module-level `var` globals plus localStorage**, declared together near the top of the `<script>` ([index.html:372-402](index.html#L372-L402)); there is no store or reactive framework. The canonical per-parcel record is `{ customArea, loadKw, ssName, dlName, supplyRate, status, memo }` ([index.html:644](index.html#L644)).
- DOM IDs are camelCase, CSS classes kebab-case, and section comments are marked with a leading `★`.
