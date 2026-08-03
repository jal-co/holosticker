import * as THREE from "three"
import type { StickerSettings } from "./settings"
import { peelAngles } from "./settings"

const SEGS = 160
const MAXD = 160 // distance-field range in pixels

/** Exact euclidean distance transform (Felzenszwalb). */
function distanceField(alpha: Uint8ClampedArray, w: number, h: number) {
  const pad = MAXD
  const W = w + 2 * pad
  const H = h + 2 * pad
  const INF = 1e20
  const dsq = new Float64Array(W * H).fill(INF)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[(y * w + x) * 4 + 3] > 127) dsq[(y + pad) * W + x + pad] = 0
    }
  }
  const n = Math.max(W, H)
  const f = new Float64Array(n)
  const dOut = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  const dt1 = (len: number) => {
    let k = 0
    v[0] = 0
    z[0] = -INF
    z[1] = INF
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) {
        k--
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      }
      k++
      v[k] = q
      z[k] = s
      z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++
      const dq = q - v[k]
      dOut[q] = dq * dq + f[v[k]]
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = dsq[y * W + x]
    dt1(H)
    for (let y = 0; y < H; y++) dsq[y * W + x] = dOut[y]
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = dsq[y * W + x]
    dt1(W)
    for (let x = 0; x < W; x++) dsq[y * W + x] = dOut[x]
  }
  const dist = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) dist[i] = Math.sqrt(dsq[i])
  return { dist, W, pad }
}

/** Procedural studio environment as an equirect texture (softboxes + sky). */
function studioEnvTexture(): THREE.Texture {
  const w = 1024
  const h = 512
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  // vertical gradient: bright ceiling, mid walls, darker floor
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, "#f4f5f7")
  g.addColorStop(0.45, "#c9ccd2")
  g.addColorStop(0.55, "#aeb2b9")
  g.addColorStop(1, "#7c8087")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // softbox blobs
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => {
    const r = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
    r.addColorStop(0, `rgba(255,255,255,${a})`)
    r.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = r
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, ry / rx)
    ctx.translate(-x, -y)
    ctx.beginPath()
    ctx.arc(x, y, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  blob(w * 0.25, h * 0.22, 190, 110, 0.98)
  blob(w * 0.72, h * 0.3, 130, 80, 0.85)
  blob(w * 0.5, h * 0.75, 220, 60, 0.25)
  const tex = new THREE.CanvasTexture(canvas)
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  return tex
}

const VERT = /* glsl */ `
out vec2 vUv;
out vec3 vNormal;
out vec3 vWorldPos;
out float vAO;
uniform float uCurlH;
void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vAO = clamp(position.z / max(uCurlH, 1e-4), 0.0, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

const FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
in vec3 vNormal;
in vec3 vWorldPos;
in float vAO;
out vec4 outColor;

uniform sampler2D uMap;   // albedo, alpha = die-cut shape
uniform sampler2D uEnv;   // equirect studio environment
uniform vec3 uCamPos;
uniform float uMaxMip;
uniform float uMetal;
uniform float uRough;
uniform float uEnvIntensity;
uniform float uHolo;
uniform float uBands;
uniform float uHue;
uniform float uGrain;
uniform float uPattern;
uniform float uPeelOn;
uniform vec2 uLight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1, 0));
  float c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 lin2srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

vec2 equirectUv(vec3 d) {
  d = normalize(d);
  float phi = atan(d.z, d.x);
  float theta = acos(clamp(d.y, -1.0, 1.0));
  return vec2((phi + 3.14159265) / 6.2831853, theta / 3.14159265);
}
vec3 envSample(vec3 R, float rough) {
  return srgb2lin(textureLod(uEnv, equirectUv(R), rough * uMaxMip).rgb);
}

// diffraction phase pattern across the sticker surface
float patternPhase(vec2 uv) {
  float n = vnoise(uv * 5.0 + uLight);
  if (uPattern < 0.5) {
    return dot(uv - uLight, normalize(vec2(0.85, 0.55))) * uBands + n * 1.5;
  } else if (uPattern < 1.5) {
    return length(uv - uLight) * uBands * 1.6 + n * 1.2;
  }
  return n * 5.0 + vnoise(uv * 11.0) * 2.5;
}

// thin-film iridescence driven by view angle + surface diffraction pattern
vec3 filmColor(float cosT, vec2 uv) {
  float phase = 6.2831853 *
    (0.35 + 1.15 * (1.0 - cosT) + patternPhase(uv) * 0.09 + uHue);
  vec3 rain = 0.5 + 0.5 * vec3(sin(phase), sin(phase + 2.094), sin(phase + 4.188));
  return mix(vec3(1.0), rain, uHolo);
}

void main() {
  vec4 base = texture(uMap, vUv);
  if (base.a < 0.05) discard;
  base.rgb = srgb2lin(base.rgb);

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  if (!gl_FrontFacing) {
    // glossy foil liner backside: mirror-like with rainbow catch
    N = -N;
    vec3 Rb = reflect(-V, N);
    float cosT = clamp(dot(N, V), 0.0, 1.0);
    float shade = mix(1.0, 0.5, (1.0 - vAO) * uPeelOn);
    vec3 col = vec3(0.55);
    vec3 env = envSample(Rb, 0.1) * 1.6;
    float fres = 0.4 + 0.6 * pow(1.0 - cosT, 3.0);
    col += env * (0.5 + 0.5 * fres) * mix(vec3(1.0), filmColor(cosT, vUv), 0.75);
    col *= shade;
    outColor = vec4(lin2srgb(col), base.a);
    return;
  }

  vec3 R = reflect(-V, N);
  float cosT = clamp(dot(N, V), 0.0, 1.0);
  float brightness = lum(base.rgb);

  // ---- metallic flakes ----
  float flakeI = 0.0;
  vec3 flakeEnv = vec3(0.0);
  if (uGrain > 0.01) {
    float cell = hash(floor(vUv * 700.0));
    float mask = smoothstep(1.0 - uGrain * 0.6, 1.0, cell);
    float angleOff = (hash(vec2(cell, cell + 3.0)) - 0.5) * 0.3;
    vec3 pN = normalize(N + vec3(angleOff, angleOff * 0.7, 0.0));
    vec3 PR = reflect(-V, pN);
    float spark = pow(clamp(dot(pN, V) * 0.5 + 0.5, 0.0, 1.0), 8.0);
    flakeEnv = envSample(PR, 0.15) * mix(vec3(1.0), filmColor(dot(pN, V), vUv), 0.9);
    flakeI = clamp(mask * max(spark, 0.2) * 6.0, 0.0, 1.0) * min(uGrain * 2.0, 1.0);
  }

  // ---- environment reflection with fresnel ----
  float rough = mix(uRough, 0.9, flakeI);
  vec3 env = envSample(R, rough) * uEnvIntensity;
  env = mix(env, flakeEnv * uEnvIntensity, flakeI);

  float F0 = mix(0.05, 0.9, uMetal);
  float fres = F0 + (1.0 - F0) * pow(1.0 - cosT, 5.0);

  // iridescence, strongest on bright foil, subtle on dark ink
  vec3 iri = filmColor(cosT, vUv);
  iri = mix(vec3(1.0), iri, mix(0.55, 1.0, brightness));

  // ---- key light (follows the light position control) ----
  vec3 L = normalize(vec3((uLight.x - 0.5) * 2.2, (uLight.y - 0.5) * 2.2, 1.4));
  float dif = clamp(dot(N, L), 0.0, 1.0);
  float specKey = pow(clamp(dot(R, L), 0.0, 1.0), 60.0);

  vec3 diffuse = base.rgb * (1.0 - uMetal * 0.55) * (0.5 + 0.6 * dif);
  vec3 spec = env * fres * iri * (1.0 - rough * 0.6) * 1.8;
  spec += iri * specKey * 0.6;
  spec *= mix(0.3, 1.0, brightness); // dark ink keeps sheen but stays dark
  vec3 color = diffuse + spec + flakeEnv * flakeI * 0.5;

  // slight shadowing where the sheet curls up from the surface
  color *= mix(1.0, 0.88, (1.0 - vAO) * uPeelOn * step(0.02, vAO));

  outColor = vec4(lin2srgb(color), base.a);
}`

export class HoloRenderer {
  canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private geometry: THREE.PlaneGeometry
  private material: THREE.ShaderMaterial
  private mesh: THREE.Mesh
  private shadowMat: THREE.Material & { opacity: number }
  private shadowMesh!: THREE.Mesh
  private source: ImageBitmap | null = null
  private geomKey = ""
  private mapsKey = ""
  private mapAspect = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = THREE.NoToneMapping

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20)
    this.camera.position.set(0, 0, 3.2)

    this.geometry = new THREE.PlaneGeometry(1, 1, SEGS, SEGS)

    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: null },
        uEnv: { value: studioEnvTexture() },
        uCamPos: { value: this.camera.position },
        uMaxMip: { value: 8 },
        uMetal: { value: 0.6 },
        uRough: { value: 0.18 },
        uEnvIntensity: { value: 1.0 },
        uHolo: { value: 0.85 },
        uBands: { value: 9 },
        uHue: { value: 0 },
        uGrain: { value: 0.35 },
        uPattern: { value: 0 },
        uPeelOn: { value: 0 },
        uLight: { value: new THREE.Vector2(0.65, 0.7) },
        uCurlH: { value: 0.1 },
      },
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.mesh)

    // soft blob shadow under the sticker
    const sc = document.createElement("canvas")
    sc.width = sc.height = 256
    const sctx = sc.getContext("2d")!
    const grad = sctx.createRadialGradient(128, 128, 30, 128, 128, 128)
    grad.addColorStop(0, "rgba(0,0,0,0.85)")
    grad.addColorStop(0.7, "rgba(0,0,0,0.35)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    sctx.fillStyle = grad
    sctx.fillRect(0, 0, 256, 256)
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sc),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this.shadowMat,
    )
    this.shadowMesh.position.z = -0.05
    this.scene.add(this.shadowMesh)
  }

  setImage(source: ImageBitmap | null) {
    this.source = source
    this.mapsKey = ""
  }

  hasImage() {
    return this.source !== null
  }

  /** Build the albedo+shape texture from the artwork and its distance field. */
  private updateMaps(s: StickerSettings) {
    const src = this.source
    if (!src) return
    const key = `${s.border}|${src.width}x${src.height}`
    if (key === this.mapsKey) return
    this.mapsKey = key

    const scale = Math.min(1024 / Math.max(src.width, src.height), 1)
    const w = Math.round(src.width * scale)
    const h = Math.round(src.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    ctx.drawImage(src, 0, 0, w, h)
    const img = ctx.getImageData(0, 0, w, h)
    const { dist, W, pad } = distanceField(img.data, w, h)

    const borderPx = s.border * 2.3 * w
    const off = Math.ceil(borderPx + 6)
    const ow = w + 2 * off
    const oh = h + 2 * off
    const out = new Uint8ClampedArray(new ArrayBuffer(ow * oh * 4))
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const ax = x - off
        const ay = y - off
        const o = (y * ow + x) * 4
        const inArt = ax >= 0 && ax < w && ay >= 0 && ay < h
        const d =
          ax >= -pad && ax < w + pad && ay >= -pad && ay < h + pad
            ? dist[(ay + pad) * W + ax + pad]
            : MAXD
        // antialiased die-cut shape edge
        const shape = Math.max(
          0,
          Math.min(255, Math.round((borderPx - d + 0.5) * 255)),
        )
        // silver foil base
        let r = 214
        let g = 216
        let b = 220
        if (inArt) {
          const i = (ay * w + ax) * 4
          const a = img.data[i + 3] / 255
          r = Math.round(r * (1 - a) + img.data[i] * a)
          g = Math.round(g * (1 - a) + img.data[i + 1] * a)
          b = Math.round(b * (1 - a) + img.data[i + 2] * a)
        }
        out[o] = r
        out[o + 1] = g
        out[o + 2] = b
        out[o + 3] = shape
      }
    }
    const c = document.createElement("canvas")
    c.width = ow
    c.height = oh
    c.getContext("2d")!.putImageData(new ImageData(out, ow, oh), 0, 0)
    const tex = new THREE.CanvasTexture(c)
    tex.anisotropy = 8
    tex.colorSpace = THREE.NoColorSpace
    tex.premultiplyAlpha = false

    const old = this.material.uniforms.uMap.value as THREE.Texture | null
    old?.dispose()
    this.material.uniforms.uMap.value = tex
    this.mapAspect = ow / oh
  }

  /** Bend the plane: gentle bow + cylinder page-curl for the peel. */
  private updateGeometry(s: StickerSettings) {
    const aspect = this.mapAspect
    const key = `${s.peelAmount}|${s.peelDirection}|${s.curl}|${aspect}`
    if (key === this.geomKey) return
    this.geomKey = key

    const ang = peelAngles[s.peelDirection]
    const d = new THREE.Vector2(Math.cos(ang), Math.sin(ang))
    const pos = this.geometry.attributes.position
    const sx = aspect >= 1 ? 1 : aspect
    const sy = aspect >= 1 ? 1 / aspect : 1

    const ext = 0.5 * Math.hypot(sx, sy)
    const foldC = ext - s.peelAmount * 2 * ext
    const r = Math.max(s.curl, 0.02) * 1.4
    // conical roll: tighter near the peel corner, opening outward
    const perp = new THREE.Vector2(-d.y, d.x)
    const corner = new THREE.Vector2(
      Math.sign(-d.x) * sx * 0.5,
      Math.sign(-d.y) * sy * 0.5,
    )
    const qc = corner.x * perp.x + corner.y * perp.y
    const cone = 2 * Math.abs(d.x * d.y) // 1 on diagonals, 0 on edges

    for (let i = 0; i < pos.count; i++) {
      const ux = ((i % (SEGS + 1)) / SEGS - 0.5) * sx
      const uy = (0.5 - Math.floor(i / (SEGS + 1)) / SEGS) * sy
      let x = ux
      let y = uy
      let z = 0
      const c = -(ux * d.x + uy * d.y) // distance toward the peel corner
      const u = c - foldC
      if (s.peelAmount > 0.001 && u > 0) {
        const lq = Math.abs(ux * perp.x + uy * perp.y - qc) / ext
        const rEff = r * Math.max(0.4, 1 + cone * (lq - 0.55) * 1.3)
        const theta = u / rEff
        let newC: number
        if (theta < Math.PI) {
          newC = foldC + rEff * Math.sin(theta)
          z = rEff * (1 - Math.cos(theta))
        } else {
          newC = foldC - (u - Math.PI * rEff)
          z = 2 * rEff
        }
        const shift = newC - c
        x -= d.x * shift
        y -= d.y * shift
      }
      // gentle overall bow so the sticker doesn't look laser-flat
      const bx = (ux / (sx * 0.5)) ** 2
      const by = (uy / (sy * 0.5)) ** 2
      z += 0.03 * (1 - 0.5 * bx - 0.5 * by)
      pos.setXYZ(i, x, y, z)
    }
    pos.needsUpdate = true
    this.geometry.computeVertexNormals()
    this.material.uniforms.uCurlH.value = 2 * r
  }

  render(input: { settings: StickerSettings; imgAspect: number }) {
    const s = input.settings
    this.updateMaps(s)
    if (this.source) this.updateGeometry(s)

    this.mesh.visible = this.source !== null
    this.mesh.scale.set(s.size * 1.15, s.size * 1.15, 1)

    const u = this.material.uniforms
    u.uHolo.value = s.holoIntensity
    u.uBands.value = s.bands
    u.uHue.value = s.hueShift
    u.uGrain.value = s.grain
    u.uPattern.value =
      s.pattern === "linear" ? 0 : s.pattern === "radial" ? 1 : 2
    u.uPeelOn.value = s.peelAmount > 0.001 ? 1 : 0
    ;(u.uLight.value as THREE.Vector2).set(s.light.x, s.light.y)

    // blob shadow follows sticker size, offset away from the light
    const ba = this.mapAspect
    const bsx = ba >= 1 ? 1 : ba
    const bsy = ba >= 1 ? 1 / ba : 1
    this.shadowMesh.visible = this.source !== null
    this.shadowMesh.scale.set(
      s.size * 1.15 * bsx * 1.12,
      s.size * 1.15 * bsy * 1.12,
      1,
    )
    this.shadowMesh.position.set(
      -(s.light.x - 0.5) * 0.12,
      -(s.light.y - 0.5) * 0.12,
      -0.05,
    )
    this.shadowMat.opacity = 0.5 * s.shadow

    this.renderer.setSize(this.canvas.width, this.canvas.height, false)
    this.camera.aspect = this.canvas.width / this.canvas.height
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }

  async exportPNG(input: {
    settings: StickerSettings
    imgAspect: number
  }): Promise<Blob> {
    const prevW = this.canvas.width
    const prevH = this.canvas.height
    const size = input.settings.exportSize
    this.canvas.width = size
    this.canvas.height = size
    this.render(input)
    const blob = await new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("export failed"))),
        "image/png",
      )
    })
    this.canvas.width = prevW
    this.canvas.height = prevH
    this.render(input)
    return blob
  }
}
