export type HoloPattern = "linear" | "radial" | "patches"
export type HoloOverlay = "none" | "triangles" | "squares" | "stripes"
export type LayerMaterial =
  | "auto"
  | "glitter"
  | "chrome"
  | "matte"
  | "prism"
  | "satin"
export type PeelDirection =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"

export interface StickerSettings {
  /** Sticker scale within the canvas, 0.3–1 */
  size: number
  /** Die-cut white/foil border width, 0–0.08 (uv units) */
  border: number
  /** Cut tolerance: interior holes/gaps smaller than this stay foil, 0–0.12 */
  cutTolerance: number
  /** Refractor facet overlay pattern */
  overlay: HoloOverlay
  /** Ink visibility: 0 = foil only, 1 = as uploaded, up to 2 = densified */
  ink: number
  /** Exploded view: backing paper, kiss-cut foil blank, and artwork */
  layersOn: boolean
  /** Separation between the exploded layers, 0–0.3 */
  layerDepth: number
  /** Material preset per layer: [backing, kiss-cut foil, artwork] */
  layerMaterials: LayerMaterial[]
  /** Holographic rainbow intensity, 0–1 */
  holoIntensity: number
  /** Rainbow band frequency, 1–20 */
  bands: number
  /** Extra hue rotation, 0–1 */
  hueShift: number
  /** Foil grain amount, 0–1 */
  grain: number
  /** Rainbow pattern style */
  pattern: HoloPattern
  /** Corner being peeled */
  peelDirection: PeelDirection
  /** Peel progress, 0–1 */
  peelAmount: number
  /** Curl radius, 0.02–0.25 */
  curl: number
  /** Drop-shadow strength under the curl, 0–1 */
  shadow: number
  /** Light position in uv space */
  light: { x: number; y: number }
  /** Preview background; transparent renders the standard checkerboard */
  background: "transparent" | "white" | "black"
  /** Export resolution (square, px) */
  exportSize: number
}

export const defaultSettings: StickerSettings = {
  size: 0.83,
  border: 0.028,
  cutTolerance: 0.04,
  overlay: "triangles",
  ink: 1,
  layersOn: true,
  layerDepth: 0.002,
  layerMaterials: ["matte", "auto", "matte"],
  holoIntensity: 0.85,
  bands: 9,
  hueShift: 0,
  grain: 0.35,
  pattern: "linear",
  peelDirection: "top-right",
  peelAmount: 0.39,
  curl: 0.09,
  shadow: 0,
  light: { x: 0.65, y: 0.7 },
  background: "transparent",
  exportSize: 2048,
}

export const peelAngles: Record<PeelDirection, number> = {
  // angle of the direction the peel travels (from corner into the sticker)
  "top-right": (225 * Math.PI) / 180,
  top: (270 * Math.PI) / 180,
  "top-left": (315 * Math.PI) / 180,
  left: 0,
  "bottom-left": (45 * Math.PI) / 180,
  bottom: (90 * Math.PI) / 180,
  "bottom-right": (135 * Math.PI) / 180,
  right: Math.PI,
}
