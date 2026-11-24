// 3D keycard preview built from SCP: Secret Laboratory assets (CC BY-SA 3.0, see src/assets/keycard/LICENSE.md).
// The card print is repainted on a canvas the way the game does it: tint, permission marks, label, holder name,
// serial digits and rank rings.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import fontUrl from '../assets/keycard/Roboto-Bold.ttf?url'
import a0AlbedoUrl from '../assets/keycard/a0-albedo.webp?url'
import a0TintUrl from '../assets/keycard/a0-tint.webp?url'
import a0NormalUrl from '../assets/keycard/a0-normal.webp?url'
import a1AlbedoUrl from '../assets/keycard/a1-albedo.webp?url'
import a1TintUrl from '../assets/keycard/a1-tint.webp?url'
import a1NormalUrl from '../assets/keycard/a1-normal.webp?url'
import a4IconsUrl from '../assets/keycard/a4-icons.webp?url'
import site02Url from '../assets/keycard/site02.glb?url'
import taskforceUrl from '../assets/keycard/taskforce.glb?url'
import managementUrl from '../assets/keycard/management.glb?url'
import metalcaseUrl from '../assets/keycard/metalcase.glb?url'

// ---------- Colours (the game accepts #hex or Unity colour names) ----------
const UNITY_COLORS = {
  red: '#ff0000', cyan: '#00ffff', blue: '#0000ff', darkblue: '#0000a0', lightblue: '#add8e6', purple: '#800080',
  yellow: '#ffff00', lime: '#00ff00', fuchsia: '#ff00ff', white: '#ffffff', silver: '#c0c0c0', grey: '#808080',
  gray: '#808080', black: '#000000', orange: '#ffa500', brown: '#a52a2a', maroon: '#800000', green: '#008000',
  olive: '#808000', navy: '#000080', teal: '#008080', aqua: '#00ffff', magenta: '#ff00ff',
}
export function parseColor(value, fallback) {
  const v = String(value || '').trim().toLowerCase()
  if (UNITY_COLORS[v]) return UNITY_COLORS[v]
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v)
  if (!m) return fallback
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  return '#' + h.slice(0, 6)
}
const rgb01 = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
const clean = s => String(s || '').replace(/_/g, ' ')

// ---------- Asset loading ----------
const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src
})
let fontPromise
function loadFont() {
  fontPromise ??= new FontFace('KeycardRoboto', `url(${fontUrl})`).load().then(f => { document.fonts.add(f) })
  return fontPromise
}

const SIZE = 2048
function makeAtlas(albedo, tint) {
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = SIZE
  const ctx = cvs.getContext('2d', { willReadFrequently: true })
  let tintData = null
  if (tint) { ctx.drawImage(tint, 0, 0); tintData = ctx.getImageData(0, 0, SIZE, SIZE).data }
  ctx.clearRect(0, 0, SIZE, SIZE); ctx.drawImage(albedo, 0, 0)
  const base = ctx.getImageData(0, 0, SIZE, SIZE).data.slice()
  const tex = new THREE.CanvasTexture(cvs)
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  return { cvs, ctx, tex, img: albedo, base, tintData }
}
function loadNormal(url) {
  const tex = new THREE.TextureLoader().load(url)
  tex.flipY = false; tex.colorSpace = THREE.NoColorSpace
  return tex
}
const ATLAS_SOURCES = {
  a0: { albedo: a0AlbedoUrl, tint: a0TintUrl, normal: a0NormalUrl },
  a1: { albedo: a1AlbedoUrl, tint: a1TintUrl, normal: a1NormalUrl },
  a4: { albedo: a4IconsUrl },
}

// ---------- Painting (coordinates are 2048 atlas pixels) ----------
// The game multiplies the albedo by the tint where the mask allows it (tint map R), in linear colour space,
// with the mask itself read as sRGB (so a mask value of 188 tints only ~50%). Tint map G shades the Site-02
// label band with the "SITE ACCESS CARD" microtext.
const S2L = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
const L2S = Uint8ClampedArray.from({ length: 4096 }, (_, i) => { const c = i / 4095; return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) })
const toS = l => L2S[Math.min(4095, Math.round(l * 4095))]
function tintRect(A, x, y, w, h, tint) {
  const t = rgb01(tint).map(c => S2L[Math.round(c * 255)]), T = A.tintData, B = A.base
  const img = A.ctx.createImageData(w, h), o = img.data
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = ((y + j) * SIZE + (x + i)) * 4, d = (j * w + i) * 4
    const k = S2L[T[s]], band = T[s + 1] / 255
    o[d] = toS(S2L[B[s]] * (1 - k + k * t[0])) * band
    o[d + 1] = toS(S2L[B[s + 1]] * (1 - k + k * t[1])) * band
    o[d + 2] = toS(S2L[B[s + 2]] * (1 - k + k * t[2])) * band
    o[d + 3] = B[s + 3]
  }
  A.ctx.putImageData(img, x, y)
}
// Filled cells: the permission colour at full brightness, keeping the print texture of the cell (albedo
// normalised to the cell's own average), so white permissions stay white even on the grey Task Force print
function circles(A, color, cells, r) {
  const c = rgb01(color), B = A.base
  for (const [cx, cy] of cells) {
    const x0 = Math.round(cx - r), y0 = Math.round(cy - r), n = Math.round(2 * r)
    const img = A.ctx.getImageData(x0, y0, n, n), o = img.data
    let sum = 0, cnt = 0
    const inside = (i, j) => (i + 0.5 - r) ** 2 + (j + 0.5 - r) ** 2 <= r * r
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (inside(i, j)) {
      const s = ((y0 + j) * SIZE + x0 + i) * 4; sum += (B[s] + B[s + 1] + B[s + 2]) / 3; cnt++
    }
    const avg = sum / cnt || 255
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const s = ((y0 + j) * SIZE + x0 + i) * 4, d = (j * n + i) * 4
      const dx = i + 0.5 - r, dy = j + 0.5 - r, edge = Math.min(1, Math.max(0, r - Math.sqrt(dx * dx + dy * dy) + 0.5))
      if (!edge) continue
      const v = Math.min(1.08, ((B[s] + B[s + 1] + B[s + 2]) / 3) / avg)
      for (let k = 0; k < 3; k++) o[d + k] = o[d + k] * (1 - edge) + Math.min(255, 255 * c[k] * v) * edge
    }
    A.ctx.putImageData(img, x0, y0)
  }
}
// [category, n-th cell from the icon side] for every filled permission cell
function levelCells(levels) {
  const out = []
  levels.forEach((lvl, c) => { for (let n = 0; n < Math.min(3, Math.max(0, lvl | 0)); n++) out.push([c, n]) })
  return out
}

// In-game text boxes (TextMeshPro, Roboto-Bold SDF) read from the prefabs.
// c = box centre, a = text direction (deg), W/H = box size. The game auto-sizes to the largest size whose
// line box (1.17 em per line) fits H; Site-02 / metal case labels may first squeeze glyphs horizontally by up to 30%.
const TX = {
  s02Label: { c: [654.7, 449.1], a: 0, W: 1245, H: 202, h: 'left', v: 'geometry', adj: 0.3 },
  mcLabel: { c: [644.2, 449.1], a: 0, W: 1245, H: 202, h: 'left', v: 'geometry', adj: 0.3 },
  s02Nick: { c: [871.8, 832.0], a: -90, W: 571, H: 73, h: 'left', v: 'top' },
  tfNick: { c: [180.9, 1703.5], a: -90, W: 597, H: 77.4, h: 'left', v: 'top' },
  mgLabel: { c: [1696.6, 1929.8], a: 180, W: 591, H: 222, h: 'right', v: 'geometry', wrap: true, lineAdv: 0.872 },
}
const LINE = 1.17, ASC = 0.928   // Roboto line box and ascender, in em
const OUTLINE = 0.022            // outline width in em, measured on an in-game screenshot
const FONT = 'KeycardRoboto'
function layoutText(ctx, text, b) {
  const words = text.split(/\s+/).filter(Boolean)
  for (let size = b.H / LINE; size > 4; size *= 0.99) {
    ctx.font = `${size}px ${FONT}`
    let lines = [text]
    if (b.wrap) {
      lines = []
      for (const w of words) {
        const joined = lines.length ? lines[lines.length - 1] + ' ' + w : null
        if (joined && ctx.measureText(joined).width <= b.W) lines[lines.length - 1] = joined
        else lines.push(w)
      }
    }
    const height = size * (LINE + (lines.length - 1) * (b.lineAdv || LINE))
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width))
    const sx = Math.min(1, b.W / widest)
    if (height <= b.H + 0.5 && sx >= 1 - (b.adj || 0) - 1e-6) return { size, lines, sx }
  }
  return { size: 4, lines: [text], sx: 1 }
}
function drawText(ctx, text, b, color) {
  if (!text.trim()) return
  const { size, lines, sx } = layoutText(ctx, text, b), adv = size * (b.lineAdv || LINE)
  ctx.save(); ctx.translate(...b.c); ctx.rotate(b.a * Math.PI / 180); ctx.scale(sx, 1)
  ctx.font = `${size}px ${FONT}`; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = b.h
  const x = (b.h === 'left' ? -b.W / 2 : b.W / 2) / sx
  let y0
  if (b.v === 'top') y0 = -b.H / 2 + ASC * size
  else {   // 'geometry': centre the actual glyph bounds
    const first = ctx.measureText(lines[0]), last = ctx.measureText(lines[lines.length - 1])
    y0 = (first.actualBoundingBoxAscent - (lines.length - 1) * adv - last.actualBoundingBoxDescent) / 2
  }
  // the game's text material (TMP SDF, HDRP) draws a thin white outline layer around every glyph
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = OUTLINE * size * 2
  lines.forEach((l, i) => ctx.strokeText(l, x, y0 + i * adv))
  lines.forEach((l, i) => ctx.fillText(l, x, y0 + i * adv))
  ctx.restore()
}

function paintSite02(A, f) {
  A.ctx.clearRect(0, 0, SIZE, SIZE); A.ctx.drawImage(A.img, 0, 0)
  tintRect(A, 13, 312, 1287, 860, f.tint)
  // categories are rows (gear = admin, gun = armory, SCP = containment), filled from the column next to the icons
  const COLS = [124, 323, 523], ROWS = [651, 851, 1053]
  circles(A, f.perm, levelCells([f.adm, f.arm, f.cont]).map(([c, n]) => [COLS[2 - n], ROWS[c]]), 58)
  drawText(A.ctx, clean(f.label), f.type === 'metalcase' ? TX.mcLabel : TX.s02Label, f.labelColor)
  drawText(A.ctx, clean(f.holder), TX.s02Nick, '#646464')
  A.tex.needsUpdate = true
}
function paintA1(A, f) {
  A.ctx.clearRect(0, 0, SIZE, SIZE); A.ctx.drawImage(A.img, 0, 0)
  if (f.type === 'taskforce') {
    tintRect(A, 0, 940, 690, 1108, f.tint)
    // icons sit above the grid in the atlas; categories are columns, filled from the icon side
    const COLS = [344, 462, 580], ROWS = [1710, 1828, 1946]
    circles(A, f.perm, levelCells([f.adm, f.arm, f.cont]).map(([c, n]) => [COLS[c], ROWS[n]]), 38)
    drawText(A.ctx, clean(f.holder), TX.tfNick, '#ffc400')
  } else {
    tintRect(A, 1360, 960, 688, 1088, f.tint)
    // this card is upside down in the atlas: icons above the grid here are below it in game
    const COLS = [1438, 1556, 1674], ROWS = [1522, 1640, 1756]
    circles(A, f.perm, levelCells([f.adm, f.arm, f.cont]).map(([c, n]) => [COLS[c], ROWS[n]]), 38)
    drawText(A.ctx, clean(f.label), TX.mgLabel, f.labelColor)
  }
  A.tex.needsUpdate = true
}
function paintIcons(A, f) {
  A.ctx.clearRect(0, 0, SIZE, SIZE); A.ctx.drawImage(A.img, 0, 0)
  const rings = { 0: 0, 3: 1, 2: 2, 1: 3 }[f.rank] ?? 0
  ;[[1734, 1770], [1784, 1820], [1834, 1870]].forEach(([a, b], i) => {
    if (i >= rings) A.ctx.clearRect(a - 2, 0, b - a + 5, SIZE)
  })
  A.tex.needsUpdate = true
}

const TYPES = {
  KeycardCustomSite02: { key: 'site02', glb: site02Url, atlas: 'a0', rot: [0, 0, 90] },
  KeycardCustomMetalCase: { key: 'metalcase', glb: metalcaseUrl, atlas: 'a0', rot: [0, 0, 90] },
  KeycardCustomTaskForce: { key: 'taskforce', glb: taskforceUrl, atlas: 'a1', rot: [0, 0, 90] },
  KeycardCustomManagement: { key: 'management', glb: managementUrl, atlas: 'a1', rot: [0, 0, 90] },
}
const DIGIT_STEP = 71.6 / SIZE

export class KeycardScene {
  constructor(container) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.NeutralToneMapping
    // calibrated so a front-facing card shows its colours close to 1:1 (white ≈ 227); brighter washes tints out
    this.renderer.toneMappingExposure = 0.7
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.environment = this.envTex
    this.scene.environmentIntensity = 0.6
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 6); this.scene.add(key)
    const rim = new THREE.DirectionalLight(0xbfd8ff, 0.8); rim.position.set(-4, -2, -3); this.scene.add(rim)

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enablePan = false; this.controls.minDistance = 4; this.controls.maxDistance = 14
    // the back of a keycard can't be seen in game, so the view stays on the front (±60° tilt)
    this.controls.minAzimuthAngle = -Math.PI / 3; this.controls.maxAzimuthAngle = Math.PI / 3
    this.controls.minPolarAngle = Math.PI / 6; this.controls.maxPolarAngle = Math.PI * 5 / 6
    this.controls.addEventListener('change', () => this.render())
    this.resetView()

    this.atlases = {}; this.models = {}; this.current = null; this.disposed = false; this.token = 0
    this.loader = new GLTFLoader()
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(container)
    this.resize()
  }

  resetView() {
    this.camera.position.set(0.8, 0.5, 7.6); this.controls.target.set(0, 0, 0); this.controls.update()
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix()
    this.render()
  }

  render() { if (!this.disposed) this.renderer.render(this.scene, this.camera) }

  atlas(name) {
    this.atlases[name] ??= (async () => {
      const src = ATLAS_SOURCES[name]
      const [albedo, tint] = await Promise.all([loadImage(src.albedo), src.tint ? loadImage(src.tint) : null])
      const A = makeAtlas(albedo, tint)
      if (src.normal) A.normal = loadNormal(src.normal)
      return A
    })()
    return this.atlases[name]
  }

  model(type) {
    const def = TYPES[type]
    this.models[type] ??= (async () => {
      const [gltf, A, icons] = await Promise.all([this.loader.loadAsync(def.glb), this.atlas(def.atlas), this.atlas('a4')])
      const root = gltf.scene
      root.traverse(o => {
        if (!o.isMesh) return
        const name = o.material.name || ''
        if (name.startsWith('keycard_overlays')) { o.visible = false; return }   // wear decals
        if (name.startsWith('keycard_icons')) {
          o.material = new THREE.MeshStandardMaterial({ map: icons.tex, roughness: 0.5, metalness: 0.1, alphaTest: 0.5 })
          const uv = o.geometry.attributes.uv
          o.userData.uv0 = Array.from({ length: uv.count }, (_, i) => [uv.getX(i), uv.getY(i)])
          const m = /Digit_(\d+)/.exec(o.name); if (m) o.userData.digit = +m[1] - 1
          return
        }
        const metal = /GUARD/.test(o.name)
        o.material = new THREE.MeshStandardMaterial({
          map: A.tex, normalMap: A.normal, roughness: metal ? 0.35 : 0.45, metalness: metal ? 0.6 : 0.05,
        })
      })
      const holder = new THREE.Group(); holder.add(root)
      const box = new THREE.Box3().setFromObject(root)
      root.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      holder.scale.setScalar(3.2 / Math.max(size.x, size.y, size.z))
      holder.rotation.set(...def.rot.map(d => d * Math.PI / 180))
      return holder
    })()
    return this.models[type]
  }

  setDigits(root, serial, dash) {
    const s = String(serial || '').padEnd(12, '0').slice(0, 12)
    root.traverse(o => {
      if (o.userData.digit === undefined) return
      const ch = s[o.userData.digit], d = /\d/.test(ch) ? +ch : (dash ? 10 : 0)
      const uv = o.geometry.attributes.uv, src = o.userData.uv0
      // glTF attributes may be interleaved, so never write uv.array directly
      for (let i = 0; i < uv.count; i++) uv.setXY(i, src[i][0], src[i][1] - d * DIGIT_STEP)
      uv.needsUpdate = true
    })
  }

  // f: { cardType, tint, perm, labelColor (resolved #hex), label, holder, serial, rank, cont, arm, adm }
  async update(f) {
    const def = TYPES[f.cardType]
    if (!def) return
    const token = ++this.token
    await loadFont()
    const [obj, A, icons] = await Promise.all([this.model(f.cardType), this.atlas(def.atlas), this.atlas('a4')])
    if (this.disposed || token !== this.token) return
    const p = { ...f, type: def.key }
    if (def.atlas === 'a0') paintSite02(A, p); else paintA1(A, p)
    paintIcons(icons, p)
    if (def.key === 'taskforce' || def.key === 'metalcase') this.setDigits(obj, f.serial, def.key === 'taskforce')
    if (this.current !== obj) {
      if (this.current) this.scene.remove(this.current)
      this.scene.add(obj); this.current = obj; this.resetView()
    }
    this.render()
  }

  dispose() {
    this.disposed = true
    this.ro.disconnect(); this.controls.dispose()
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) o.material.dispose()
    })
    for (const p of Object.values(this.atlases)) p.then(A => { A.tex.dispose(); A.normal?.dispose() }).catch(() => {})
    for (const p of Object.values(this.models)) p.then(m => m.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.() })).catch(() => {})
    this.envTex.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
