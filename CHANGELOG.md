# holosticker

## 1.6.0

### Minor Changes

- d88758b: MP4 video export alongside GIF in a unified animation dialog with format, background, and speed controls; Share on X shares the encoded file via the mobile share sheet, clipboard, or a save-and-drag hint; rotation lock ("L") with kbd hint; smooth peel lighting in animation loops; and a toolfolio verification tag

## 1.5.0

### Minor Changes

- 30f1a73: Reliable GIF export flow with in-dialog result preview and gesture-driven save, Share on X posts the actual encoded GIF, "L" locks canvas rotation (with kbd hint) and locked tilt bakes into PNG exports, smooth peel lighting in GIF loops, and hardened keyboard shortcuts

### Patch Changes

- 479da71: Exported component holds its tilt when the cursor leaves instead of animating back to center
- 5fd754f: Component export downloads reliably: the tsx and artwork files no longer race each other

## 1.4.0

### Minor Changes

- 6dd15ba: Vinyl relief lip at the kiss-cut edge, finish presets (Holo / Glossy / Matte / Chrome / Glitter) as a segmented control, glossy layer material, shadcn-style single-file component export with integration instructions, custom icon set, and new defaults

## 1.3.0

### Minor Changes

- d303473: Richer foil model inspired by konvert.design's sticker tool: flare zones that pool across the surface via domain-warped noise, ink-tinted metallic reflections beneath a clear laminate, curl-driven color shift on the peel, and per-cell glitter twinkle - all rendered with Holosticker's own rainbow palette
- 145192f: Share button in the toolbar: posts to X with @jalcowastaken tagged and a link to holosticker.dev

## 1.2.0

### Minor Changes

- 0723829: 3D color layers: separate artwork colors into stacked layers with per-layer foil finishes and adjustable depth

### Patch Changes

- 4e00514: Fix PNG/GIF exports cropping the sticker: the preview render loop no longer resizes the canvas mid-export

## 1.1.1

### Patch Changes

- 23b3d9d: CI now verifies a changeset accompanies every pull request, and main is branch-protected behind the Build and Changeset checks
- 8882f4c: Speed control for GIF export: 0.5×–2× slider with live preview

## 1.1.0

### Minor Changes

- Export dropdown with PNG, animated GIF, and GLB 3D model formats. GIF export flow with live preview, holo-sweep or full peel-off loops, and background options; the peel-off animation carries the sticker out of frame along the peel direction. GLB export carries the peel geometry and real glTF iridescence. Ink slider, refractor overlays, cut tolerance, dark mode, mobile layout, settings import/export, and a changelog dialog.

## 1.0.0

### Minor Changes

- Real-time three.js holofoil rendering with diffraction bands, iridescence, flakes, and studio lighting
- Pointer tilt with sweeping rainbow reflections
- Exact distance-field die-cut border
- 3D page-curl peel with glossy liner backside
- Transparent PNG export at 1024 / 2048 / 4096
