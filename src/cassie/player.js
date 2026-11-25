import { stutterCost } from './interpret.js'

const BASE_URL = import.meta.env.BASE_URL + 'cassie/'
const WORD_VOLUME = 0.6
const BACKGROUND_VOLUME = 0.29
const DUCK_LEVEL = 0.5
const DUCK_ATTACK = 0.12
const DUCK_RELEASE = 0.04
const SCHEDULER_OFFSET = 0.2
const BACKGROUND_END_MARK = 29.1
const BACKGROUND_MIN_DURATION = 4
const TRANSITION_LENGTH = 0.8

const START_CURVE = [
  [0, 1, -0.35207, -0.35207],
  [0.6532, 0.57814, -1.34665, -1.34665],
  [1, 0, -0.16853, -0.16853],
]
const END_CURVE = [
  [0, 0, 2.28454, 2.28454],
  [1, 1, 0.03766, 0.03766],
]
const TRANSITION_CURVE = [
  [4, 3, 0.99951, 0.99951],
  [9.98621, 8.98326, 0.9972, 0.9972],
  [10.999, 10, 0.97422, 0.97422],
  [11, 9.00423, 0.03851, 0.03851],
  [11.001, 9, 0.99326, 0.99326],
  [15.999, 14, 0.98707, 0.98707],
  [16, 12, 0.98918, 0.98918],
  [17.2619, 12, Infinity, Infinity],
  [17.5, 12, 0.99449, 0.99449],
  [25.5, 20, 0.98627, 0.98627],
  [50, 29, 0.9625, 0.9625],
]

function evaluateCurve(keys, t) {
  if (t <= keys[0][0]) return keys[0][1]
  const last = keys[keys.length - 1]
  if (t >= last[0]) return last[1]
  let i = 0
  while (t > keys[i + 1][0]) i++
  const [t0, v0, , out0] = keys[i]
  const [t1, v1, in1] = keys[i + 1]
  if (!Number.isFinite(out0) || !Number.isFinite(in1)) return v0
  const dt = t1 - t0
  const u = (t - t0) / dt
  const u2 = u * u, u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * out0 * dt + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * in1 * dt
}

function sampleCurve(keys, scale) {
  return Float32Array.from({ length: 48 }, (_, i) => Math.max(0, evaluateCurve(keys, i / 47) * scale))
}

function stutterSegments(offset, clipLength, stutter) {
  if (!stutter) return [[offset, clipLength]]
  const from = stutter.start * clipLength
  const loopEnd = from + stutter.length
  const segments = []
  let pos = offset
  let remaining = stutter.repetitions
  const catchUp = () => {
    let jumped = false
    while (remaining > 0 && pos >= loopEnd) { remaining--; pos -= stutter.length; jumped = true }
    if (jumped) pos = Math.max(0, pos)
  }
  catchUp()
  while (remaining > 0 && loopEnd < clipLength) {
    segments.push([pos, loopEnd])
    pos = loopEnd
    catchUp()
  }
  segments.push([pos, clipLength])
  return segments
}

function mergeSpans(spans) {
  const sorted = [...spans].sort((a, b) => a[0] - b[0])
  const merged = []
  for (const [a, b] of sorted) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1] + 0.15) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return merged
}

export class CassiePlayer {
  constructor() {
    this.ctx = null
    this.cache = new Map()
    this.nodes = []
    this.token = 0
  }

  context() {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  buffer(name) {
    if (!this.cache.has(name)) {
      const p = fetch(BASE_URL + name + '.ogg')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer() })
        .then(data => this.context().decodeAudioData(data))
      p.catch(() => this.cache.delete(name))
      this.cache.set(name, p)
    }
    return this.cache.get(name)
  }

  async play(result, playBackground) {
    this.stop()
    const token = ++this.token
    const ctx = this.context()
    await ctx.resume()
    const ids = [...new Set(result.clips.map(c => c.line.id))]
    const [background, ...buffers] = await Promise.all([
      playBackground ? this.buffer('background') : null,
      ...ids.map(id => this.buffer(String(id))),
    ])
    if (token !== this.token) return null
    const byId = new Map(ids.map((id, i) => [id, buffers[i]]))
    const out = ctx.createGain()
    out.connect(ctx.destination)
    this.out = out
    const callTime = ctx.currentTime + 0.05
    const origin = callTime + SCHEDULER_OFFSET
    let end = origin + result.duration
    const speech = []
    for (const clip of result.clips) {
      const span = this.scheduleClip(byId.get(clip.line.id), clip, origin + clip.at, out)
      if (clip.line.name !== '.') speech.push(span)
      end = Math.max(end, span[1])
    }
    if (background) end = Math.max(end, this.scheduleBackground(background, origin, result.duration, callTime, out, speech))
    return { origin, end }
  }

  source(buffer, destination, rate = 1) {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = rate
    src.connect(destination)
    this.nodes.push(src)
    return src
  }

  scheduleClip(buffer, { line, mods }, when, out) {
    const ctx = this.ctx
    const pitch = mods.pitch ?? 1
    const start = when + (mods.sleep ?? 0)
    const offset = Math.min(Math.max(mods.startTime ?? 0, 0), Math.max(0, buffer.duration - 1 / buffer.sampleRate))
    const end = start + (mods.maxDuration ?? line.length) / pitch + stutterCost(mods.stutter)
    const gain = ctx.createGain()
    gain.gain.value = WORD_VOLUME * (mods.volume ?? 1)
    gain.connect(out)
    let t = start
    for (const [a, b] of stutterSegments(offset, buffer.duration, mods.stutter)) {
      if (t >= end) break
      if (b <= a) continue
      const length = (b - a) / pitch
      const src = this.source(buffer, gain, pitch)
      src.start(t, a)
      src.stop(Math.min(end, t + length))
      t += length
    }
    return [start, Math.min(end, t)]
  }

  scheduleBackground(buffer, start, duration, callTime, out, speech) {
    const ctx = this.ctx
    const length = Math.max(duration, BACKGROUND_MIN_DURATION)
    const end = start + length
    const duck = ctx.createGain()
    duck.connect(out)
    for (const [from, to] of mergeSpans(speech)) {
      duck.gain.setTargetAtTime(DUCK_LEVEL, from, DUCK_ATTACK)
      duck.gain.setTargetAtTime(1, to, DUCK_RELEASE)
    }
    const first = ctx.createGain()
    const second = ctx.createGain()
    first.gain.value = BACKGROUND_VOLUME
    second.gain.value = 0
    first.connect(duck)
    second.connect(duck)
    this.source(buffer, first).start(start, 0)
    const transition = start + evaluateCurve(TRANSITION_CURVE, length)
    first.gain.setValueCurveAtTime(sampleCurve(START_CURVE, BACKGROUND_VOLUME), transition, TRANSITION_LENGTH)
    second.gain.setValueCurveAtTime(sampleCurve(END_CURVE, BACKGROUND_VOLUME), transition, TRANSITION_LENGTH)
    const secondStart = end - BACKGROUND_END_MARK
    let finish = transition + TRANSITION_LENGTH
    if (secondStart - 0.15 >= callTime) {
      this.source(buffer, second).start(secondStart, 0)
      finish = secondStart + buffer.duration
    } else {
      const offset = callTime - (secondStart - 0.15)
      if (offset < buffer.duration) {
        this.source(buffer, second).start(callTime, offset)
        finish = callTime + buffer.duration - offset
      }
    }
    return finish
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0
  }

  stop() {
    this.token++
    for (const n of this.nodes) { try { n.stop() } catch { } }
    this.nodes = []
    if (this.out) { this.out.disconnect(); this.out = null }
  }

  dispose() {
    this.stop()
    this.ctx?.close()
    this.ctx = null
  }
}
