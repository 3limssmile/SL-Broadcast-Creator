import WORDS from './words.json'

export const WORD = 0, GLITCH = 1, OTHER = 2

export const LINES = WORDS.map(([name, step, type, length], id) => ({ id, name, step, type, length }))
const BY_NAME = new Map(LINES.map(l => [l.name, l]))
const getLine = name => (name ? BY_NAME.get(name) : undefined)

export const BACKGROUND_LEAD = 2.5

const FLOAT_RE = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/
const NUMBER_RE = /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const roundHalfEven = v => {
  const r = Math.round(v)
  return Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
}

function emptyMods() {
  return { pitch: null, volume: null, startTime: null, maxDuration: null, sleep: null, spacing: null, stutter: null }
}

function resetSingleUse(m) {
  m.startTime = null
  m.maxDuration = null
  m.spacing = null
  m.stutter = null
}

export function stutterCost(s) {
  return s ? s.length * s.repetitions : 0
}

export function timeUntilNextWord(line, m) {
  if (m.spacing != null) return m.spacing
  let t = line.step
  if (m.pitch != null) t /= m.pitch
  if (m.startTime != null) t -= m.startTime
  if (m.maxDuration != null) t = Math.min(t, m.maxDuration)
  if (m.stutter) t += stutterCost(m.stutter)
  if (m.sleep != null) t += m.sleep
  return t
}

function lookupWord(word, ctx) {
  let line = getLine(word)
  let addPause = false
  if (!line) {
    if (!word) return false
    const last = word[word.length - 1]
    if (last !== '.' && last !== ',') return false
    line = getLine(word.slice(0, -1))
    if (!line) return false
    addPause = true
  }
  ctx.add(line)
  resetSingleUse(ctx.mods)
  if (addPause) ctx.add(getLine('.'))
  if (line.type === WORD) ctx.subtitle(word)
  return true
}

function matchPrefix(word, prefix, minParts) {
  const parts = []
  let prev = null
  const separator = cur => {
    if (prev == null) return
    const s = word.slice(prev + 1, cur)
    if (FLOAT_RE.test(s)) parts.push(parseFloat(s))
  }
  for (let i = 1; i < word.length; i++) {
    if (i <= prefix.length && prefix[i - 1] !== word[i]) return null
    if (word[i] === '_') { separator(i); prev = i }
  }
  separator(word.length)
  return parts.length >= minParts ? parts : null
}

export function parseModifier(word, m) {
  if (!word || word[0] !== '$') return null
  let p
  if ((p = matchPrefix(word, 'PITCH', 1))) { m.pitch = clamp(p[0], 0.01, 15); return 'pitch' }
  if ((p = matchPrefix(word, 'VOL', 1))) { m.volume = clamp(p[0], 0, 1); return 'volume' }
  if ((p = matchPrefix(word, 'STARTT', 1))) { m.startTime = Math.max(0, p[0]); return 'startTime' }
  if ((p = matchPrefix(word, 'MAXDUR', 1))) { m.maxDuration = Math.max(0, p[0]); return 'maxDuration' }
  if ((p = matchPrefix(word, 'SLEEP', 1))) { m.sleep = Math.max(0, p[0]); return 'sleep' }
  if ((p = matchPrefix(word, 'SPAC', 1))) { m.spacing = Math.max(0, p[0]); return 'spacing' }
  if ((p = matchPrefix(word, 'STUTT', 3))) {
    m.stutter = { start: clamp(p[0], 0, 1), length: Math.max(p[1], 0), repetitions: Math.max(roundHalfEven(p[2]), 1) }
    return 'stutter'
  }
  return null
}

function modifier(word, ctx) {
  return parseModifier(word, ctx.mods) != null
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const TEENS = ['11', '12', '13', '14', '15', '16', '17', '18', '19']
const TENS = [null, '10', '20', '30', '40', '50', '60', '70', '80', '90']
const SCALES = ['HUNDRED', 'THOUSAND', 'MILLION', 'BILLION', 'TRILLION']

function number(word, ctx) {
  if (!NUMBER_RE.test(word)) return false
  let num = parseFloat(word)
  ctx.subtitle(word)
  const mods = { ...ctx.mods }
  const add = name => { const l = getLine(name); if (l) ctx.add(l, mods) }
  if (num < 0) { add('NEGATIVE'); num = -num }
  const huge = num > 999999999999.999
  if (!huge) {
    let n = Math.trunc(num)
    if (n === 0) add(DIGITS[0])
    else {
      const groups = []
      while (n > 0 && groups.length < SCALES.length) { groups.push(n % 1000); n = Math.floor(n / 1000) }
      for (let i = groups.length - 1; i >= 0; i--) {
        const g = groups[i]
        if (!g) continue
        const hundreds = Math.floor(g / 100), rest = g % 100
        if (hundreds > 0) { add(DIGITS[hundreds]); add(SCALES[0]) }
        if (rest >= 11 && rest <= 19) add(TEENS[rest - 11])
        else if (rest === 10 || rest >= 20) { add(TENS[Math.floor(rest / 10)]); if (rest % 10) add(DIGITS[rest % 10]) }
        else if (rest) add(DIGITS[rest])
        if (i > 0) add(SCALES[i])
      }
    }
  }
  let afterPoint = false
  for (const c of word) {
    if (c === '.') { afterPoint = true; add('POINT') }
    else if ((afterPoint || huge) && c >= '0' && c <= '9') add(c)
  }
  resetSingleUse(ctx.mods)
  return true
}

function suffixInterpreter(findLemma, getSuffix) {
  return (word, ctx) => {
    const lemma = findLemma(word)
    if (!lemma) return false
    const { suffix, space, cutoff } = getSuffix(word, lemma)
    const suffixLine = getLine(suffix)
    if (!suffixLine) return false
    const m = ctx.mods
    const { spacing, maxDuration } = m
    const next = timeUntilNextWord(lemma, m) + space
    m.spacing = next
    m.maxDuration = next + cutoff
    ctx.add(lemma)
    m.spacing = spacing
    m.maxDuration = maxDuration
    ctx.add(suffixLine)
    ctx.subtitle(word)
    resetSingleUse(m)
    return true
  }
}

const pastTense = suffixInterpreter(
  word => {
    if (word.endsWith('ED')) {
      const a = getLine(word.slice(0, -2))
      if (a) return a
      if (word.length > 3) { const b = getLine(word.slice(0, -3)); if (b) return b }
    }
    if (word.endsWith('D')) { const a = getLine(word.slice(0, -1)); if (a) return a }
    if (word.endsWith('IED')) { const a = getLine(word.slice(0, -3) + 'Y'); if (a) return a }
    return null
  },
  (word, lemma) => {
    const n = lemma.name
    if (n.endsWith('T') || n.endsWith('D')) return { suffix: '_SUFFIX_PAST_ID', space: -0.065, cutoff: 0.075 }
    if (n.endsWith('SH') || n.endsWith('CH') || n.endsWith('SS')) return { suffix: '_SUFFIX_PAST_T', space: 0, cutoff: 0 }
    return { suffix: 'PKFSX'.includes(n[n.length - 1]) ? '_SUFFIX_PAST_T' : '_SUFFIX_PAST_D', space: 0, cutoff: 0 }
  },
)

const continuous = suffixInterpreter(
  word => {
    if (word.length <= 3 || !word.endsWith('ING')) return null
    const stem = word.slice(0, -3)
    const a = getLine(stem)
    if (a) return a
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      const b = getLine(stem.slice(0, -1))
      if (b) return b
    }
    return getLine(stem + 'E') ?? null
  },
  () => ({ suffix: '_SUFFIX_ING', space: -0.08, cutoff: 0.08 }),
)

const plural = suffixInterpreter(
  word => {
    if (word.endsWith('ies')) { const a = getLine(word.slice(0, -3) + 'y'); if (a) return a }
    if (word.endsWith('es')) { const a = getLine(word.slice(0, -2)); if (a) return a }
    if (word.endsWith('s')) { const a = getLine(word.slice(0, -1)); if (a) return a }
    return null
  },
  (word, lemma) => {
    const n = lemma.name
    const syllabic = 'sxz'.includes(n[n.length - 1]) || ['ss', 'sh', 'ch', 'ge', 'ce', 'dge'].some(e => n.endsWith(e))
    return { suffix: syllabic ? '_suffix_plural_syllabic' : '_suffix_plural_regular', space: 0, cutoff: 0 }
  },
)

function degreeLemma(word, suffix, ySuffix) {
  if (!word.endsWith(suffix)) return null
  if (word.endsWith(ySuffix) && word.length > ySuffix.length) {
    const a = getLine(word.slice(0, -ySuffix.length) + 'Y')
    if (a) return a
  }
  const stem = word.slice(0, -suffix.length)
  if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
    const b = getLine(stem.slice(0, -1))
    if (b) return b
  }
  const cut = suffix.length - 1
  if (word.length > cut) { const c = getLine(word.slice(0, -cut)); if (c) return c }
  return getLine(stem) ?? null
}

const degree = suffixInterpreter(
  word => (word.length <= 3 ? null : degreeLemma(word, 'ER', 'IER') ?? degreeLemma(word, 'EST', 'IEST')),
  word => ({ suffix: word.endsWith('EST') ? '_SUFFIX_EST' : '_SUFFIX_ER', space: -0.08, cutoff: 0.06 }),
)

const INTERPRETERS = [
  ['word', lookupWord],
  ['modifier', modifier],
  ['number', number],
  ['suffix', pastTense],
  ['suffix', continuous],
  ['suffix', plural],
  ['suffix', degree],
]

const OLD_SYNTAX = [
  [/^PITCH_/, '$PITCH_'],
  [/^JAM_/, '$STUTT_start_length_repeats'],
  [/^YIELD_/, '$SPAC_seconds'],
]

export function interpret(message, playBackground) {
  const text = message.toUpperCase()
  const clips = []
  const tokens = []
  const subtitleWords = []
  let t = playBackground ? BACKGROUND_LEAD : 0
  const mods = emptyMods()
  let token
  const ctx = {
    mods,
    add(line, m = mods) {
      const snapshot = { ...m }
      clips.push({ line, at: t, mods: snapshot, token: tokens.length })
      token.clips.push(clips.length - 1)
      t += timeUntilNextWord(line, snapshot)
    },
    subtitle(word) { subtitleWords.push(word) },
  }
  for (const word of text.split(' ')) {
    if (!word) continue
    token = { text: word, kind: 'unknown', clips: [], start: t }
    for (const [kind, fn] of INTERPRETERS) {
      if (fn(word, ctx)) { token.kind = kind; break }
    }
    if (token.kind === 'unknown') {
      const old = OLD_SYNTAX.find(([re]) => re.test(word))
      if (old) token.hint = old[1]
    }
    token.end = t
    tokens.push(token)
  }
  return { clips, tokens, subtitle: subtitleWords.join(' '), duration: t }
}
