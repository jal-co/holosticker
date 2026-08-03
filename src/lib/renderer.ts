import type { StickerSettings } from "./settings"
import { peelAngles } from "./settings"

const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = pos;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTex;
uniform sampler2D uDistTex; // distance-to-artwork field (art px / 160)
uniform vec2 uDistScale;    // art extent inside the padded distance texture
uniform float uBorderPx;    // border width in distance-field pixels
uniform float uAaPx;        // one screen pixel in distance-field pixels
uniform float uHasTex;
uniform vec2 uImgScale;   // aspect-fit scale of image inside sticker area
uniform float uScale;     // sticker size
uniform float uBorder;    // die-cut border width (uv)
uniform float uHolo;
uniform float uBands;
uniform float uHue;
uniform float uGrain;
uniform float uPattern;   // 0 linear, 1 radial, 2 patches
uniform vec2 uLight;
uniform float uPeelAngle;
uniform float uPeel;
uniform float uCurl;
uniform float uShadow;
uniform float uPx;        // one pixel in uv units

// ---------- utils ----------
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p = p * 2.13 + vec2(11.3, 7.7);
    amp *= 0.5;
  }
  return v;
}

// ---------- artwork sampling ----------
vec2 stickerUv(vec2 uv) {
  // map canvas uv -> texture uv (centered, scaled, aspect fit)
  vec2 p = (uv - 0.5) / (uScale * uImgScale) + 0.5;
  // texture y is flipped relative to our y-up uv
  return vec2(p.x, 1.0 - p.y);
}

vec4 sampleArt(vec2 uv) {
  vec2 t = stickerUv(uv);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return vec4(0.0);
  vec4 c = texture(uTex, t);
  // premultiplied-safe: un-premultiply for color work
  if (c.a > 0.001) c.rgb /= c.a;
  return c;
}

float artAlpha(vec2 uv) {
  vec2 t = stickerUv(uv);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  return texture(uTex, t).a;
}

// die-cut sticker shape (art + border) from an exact euclidean distance
// field: dilation by a disk, so square corners become perfect round arcs
float shapeMask(vec2 uv) {
  vec2 t = stickerUv(uv);
  vec2 st = (t - 0.5) * uDistScale + 0.5;
  if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) return 0.0;
  float dpx = texture(uDistTex, st).r * 160.0;
  float aa = max(uAaPx * 0.75, 0.5);
  return smoothstep(uBorderPx + aa, uBorderPx - aa, dpx);
}

// ---------- holographic foil ----------
vec3 rainbow(vec2 uv, float seedShift) {
  float n = fbm(uv * 3.0 + uLight * 0.7);
  float n2 = fbm(uv * 9.0 - uLight * 0.4);
  float ang;
  if (uPattern < 0.5) {
    // linear diffraction bands, warped by noise
    vec2 dir = normalize(vec2(0.85, 0.55));
    ang = dot(uv - uLight, dir) * uBands + n * 3.0;
  } else if (uPattern < 1.5) {
    // radial bands from the light
    ang = length(uv - uLight) * uBands * 1.6 + n * 2.5;
  } else {
    // blotchy foil patches
    ang = n * 7.0 + n2 * 3.0 + dot(uv, vec2(1.5));
  }
  float hue = fract(ang * 0.16 + uHue + seedShift);
  vec3 c = hsv2rgb(vec3(hue, 1.0, 1.0));
  // pastelize: real holo foil reads as white with soft color washes
  c = mix(vec3(1.0), c, 0.6 + 0.2 * n2);
  // subtle fine diffraction rays radiating from the light
  vec2 rel = uv - uLight;
  float rays = 0.9 + 0.1 * sin(atan(rel.y, rel.x) * 70.0 + n * 8.0);
  return c * rays;
}

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// bright silvery foil with pastel color washes
vec3 foilColor(vec2 uv, float boost) {
  vec3 rb = rainbow(uv, 0.0);
  // large soft blotches decide where color shows vs plain silver-white
  float blotch = smoothstep(0.3, 0.78, fbm(uv * 2.4 + vec2(4.7, 1.3)));
  float mask = clamp(uHolo * boost * (0.3 + 0.7 * blotch), 0.0, 1.0);
  vec3 silver = vec3(0.94, 0.95, 0.97);
  vec3 foil = mix(silver, rb, mask);
  // glossy specular bloom near the light
  float d = length(uv - uLight);
  float spec = pow(clamp(1.0 - d, 0.0, 1.0), 4.0);
  foil += vec3(0.35) * spec * boost;
  // fine grain sparkle
  float g = hash(floor(uv * 900.0));
  foil *= 1.0 + (g - 0.5) * uGrain * 0.3;
  foil += vec3(step(0.997, g) * uGrain * 0.8);
  return clamp(foil, 0.0, 1.0);
}

// front face of the sticker at a given uv
vec4 frontFace(vec2 uv) {
  float shape = shapeMask(uv);
  if (shape < 0.004) return vec4(0.0);
  vec4 art = sampleArt(uv);
  vec3 foil = foilColor(uv, 1.0);
  // artwork printed as translucent ink over the foil: multiply
  vec3 ink = mix(vec3(1.0), art.rgb, art.a * 0.92);
  vec3 col = foil * ink;
  // prismatic sheen catching on the ink itself
  vec3 rb = rainbow(uv * 1.3, 0.4);
  col += rb * art.a * uHolo * 0.14;
  return vec4(clamp(col, 0.0, 1.0), shape);
}

void main() {
  vec2 uv = vec2(vUv.x, vUv.y); // y-up

  if (uHasTex < 0.5) { outColor = vec4(0.0); discard; }

  // ---- peel geometry ----
  vec2 d = vec2(cos(uPeelAngle), sin(uPeelAngle)); // corner -> into sticker
  // t: signed distance along peel direction, 0 at the far corner
  float ext = 0.75 * uScale;                        // sticker half-extent along d
  float t = dot(uv - vec2(0.5), d) + ext;           // 0 at the sticker corner
  float t0 = uPeel * ext * 2.05;                    // fold line
  float curlW = uCurl * 3.14159;                    // visible back band width

  float lipT = t0 + curlW;
  float sh = 0.0;
  float caster = 0.0;
  if (uPeel > 0.001) {
    // shadow the flap casts just past its lip, only under the flap silhouette
    sh = (1.0 - smoothstep(0.0, 0.05, t - lipT)) *
         smoothstep(-0.008, 0.008, t - lipT);
    caster = shapeMask(uv - (t - t0 + curlW) * d);
  }

  // ---- sticker layer (front + curled flap); t < t0 is peeled away ----
  vec4 st = vec4(0.0);
  if (t >= t0) {
    st = frontFace(uv);
    st.rgb *= 1.0 - sh * caster * uShadow * 0.28;

    if (uPeel > 0.001 && t < lipT) {
      // the curled flap folds BACK OVER the front: screen points just past
      // the fold show the foil backside of the peeled-away region
      vec2 uvBack = uv + 2.0 * (t0 - t) * d; // mirrored source point
      float shape = shapeMask(uvBack);
      if (shape > 0.004) {
        float s = (t - t0) / curlW;          // 0 at fold .. 1 at lip
        float shade = 0.8 + 0.25 * sin(s * 3.14159);
        vec3 silver = vec3(0.95, 0.96, 0.97);
        vec3 rb = rainbow(uvBack * 0.8 + vec2(s * 0.5), 0.2);
        vec3 backCol = mix(silver, rb, uHolo * 0.3) * shade;
        float streak = 0.5 + 0.5 * sin(dot(uvBack, vec2(-d.y, d.x)) * 60.0);
        backCol *= 0.92 + streak * 0.08;
        float under = 1.0 - smoothstep(0.0, 0.2, s);
        vec3 frontShadowed = st.rgb * (1.0 - under * uShadow * 0.22);
        float lip = smoothstep(1.0, 0.965, s);
        float flapA = shape * lip;
        st.rgb = mix(frontShadowed, clamp(backCol, 0.0, 1.0), flapA);
        st.a = max(st.a, flapA);
      }
    }
  }

  // premultiply for correct compositing
  vec4 col = st;
  col.rgb *= col.a;
  outColor = col;
}`

export interface RenderInput {
  image: TexImageSource | null
  imgAspect: number
  settings: StickerSettings
}

export class HoloRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  private texture: WebGLTexture | null = null
  private distTexture: WebGLTexture | null = null
  private hasTexture = false
  private distScale: [number, number] = [1, 1]
  private distW = 1
  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      antialias: true,
    })
    if (!gl) throw new Error("WebGL2 not supported")
    this.gl = gl
    this.program = this.buildProgram()
    gl.useProgram(this.program)
    for (const name of [
      "uTex", "uShapeTex", "uShapeScale", "uHasTex", "uImgScale", "uScale",
      "uBorder", "uHolo", "uBands", "uHue", "uGrain", "uPattern", "uLight",
      "uPeelAngle", "uPeel", "uCurl", "uShadow", "uPx",
      "uDistTex", "uDistScale", "uBorderPx", "uAaPx",
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    }
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
  }

  private buildProgram(): WebGLProgram {
    const gl = this.gl
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) ?? "shader compile failed")
      }
      return sh
    }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "link failed")
    }
    return program
  }

  setImage(source: ImageBitmap | null) {
    const gl = this.gl
    if (!source) {
      this.hasTexture = false
      return
    }
    if (!this.texture) this.texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.hasTexture = true
    this.updateDistanceField(source)
  }

  /** Exact euclidean distance transform of the artwork alpha (Felzenszwalb). */
  private updateDistanceField(src: ImageBitmap) {
    const MAXD = 160 // distance range in field pixels
    const scale = Math.min(1024 / Math.max(src.width, src.height), 1)
    const w = Math.round(src.width * scale)
    const h = Math.round(src.height * scale)
    const pad = MAXD
    const W = w + 2 * pad
    const H = h + 2 * pad

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    ctx.drawImage(src, 0, 0, w, h)
    const alpha = ctx.getImageData(0, 0, w, h).data

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
        let s =
          (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
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

    const data = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) {
      data[i] = Math.min(255, Math.round((Math.sqrt(dsq[i]) / MAXD) * 255))
    }

    const gl = this.gl
    if (!this.distTexture) this.distTexture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.distTexture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, W, H, 0, gl.RED, gl.UNSIGNED_BYTE, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.activeTexture(gl.TEXTURE0)
    this.distScale = [w / W, h / H]
    this.distW = w
  }

  render(input: Omit<RenderInput, "image">) {
    const gl = this.gl
    const { settings: s, imgAspect } = input
    const w = this.canvas.width
    const h = this.canvas.height
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)

    const u = this.uniforms
    gl.uniform1i(u.uTex as WebGLUniformLocation, 0)
    gl.uniform1i(u.uDistTex as WebGLUniformLocation, 1)
    gl.uniform2f(u.uDistScale!, this.distScale[0], this.distScale[1])
    const sxA = imgAspect >= 1 ? 1 : imgAspect
    const pxPerUv = this.distW / (s.size * sxA)
    gl.uniform1f(u.uBorderPx!, s.border * pxPerUv)
    gl.uniform1f(u.uAaPx!, (1 / w) * pxPerUv)
    gl.uniform1f(u.uHasTex!, this.hasTexture ? 1 : 0)
    // aspect fit inside the square canvas
    const sx = imgAspect >= 1 ? 1 : imgAspect
    const sy = imgAspect >= 1 ? 1 / imgAspect : 1
    gl.uniform2f(u.uImgScale!, sx, sy)
    gl.uniform1f(u.uScale!, s.size)
    gl.uniform1f(u.uBorder!, s.border)
    gl.uniform1f(u.uHolo!, s.holoIntensity)
    gl.uniform1f(u.uBands!, s.bands)
    gl.uniform1f(u.uHue!, s.hueShift)
    gl.uniform1f(u.uGrain!, s.grain)
    gl.uniform1f(
      u.uPattern!,
      s.pattern === "linear" ? 0 : s.pattern === "radial" ? 1 : 2,
    )
    gl.uniform2f(u.uLight!, s.light.x, s.light.y)
    gl.uniform1f(u.uPeelAngle!, peelAngles[s.peelDirection])
    gl.uniform1f(u.uPeel!, s.peelAmount)
    gl.uniform1f(u.uCurl!, s.curl)
    gl.uniform1f(u.uShadow!, s.shadow)
    gl.uniform1f(u.uPx!, 1 / w)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Render at export resolution and return a PNG blob. */
  async exportPNG(input: Omit<RenderInput, "image">): Promise<Blob> {
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
