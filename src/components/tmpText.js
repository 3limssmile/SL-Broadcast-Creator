export const BASE_SIZE = 45
const MARK_DEFAULT = '#898900'
const TMP_COLORS = {
  red: '#ff0000', white: '#ffffff', black: '#000000', green: '#00ff00',
  blue: '#0000ff', orange: '#ff8000', purple: '#a020f0', yellow: '#ffff00',
}
const TMP_IGNORED = new Set([
  'align', 'line-height', 'line-indent', 'indent', 'margin', 'margin-left', 'margin-right', 'pos',
  'space', 'width', 'rotate', 'font', 'font-weight', 'material', 'sprite', 'link', 'a', 'gradient',
  'style', 'nobr', 'mspace', 'page',
])
const STACKED = new Set(['color', 'mark', 'size', 'cspace', 'voffset'])
const CASE_TAGS = new Set(['lowercase', 'uppercase', 'allcaps', 'smallcaps'])

function parseTmpColor(value) {
  if (!value) return null
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value
  return TMP_COLORS[value.toLowerCase()] ?? null
}

function parseSize(value) {
  const m = /^([+-]?)(\d*\.?\d+)(px|%|em)?$/i.exec(value ?? '')
  if (!m) return null
  const n = parseFloat(m[2])
  const unit = (m[3] || 'px').toLowerCase()
  if (m[1]) return Math.max(1, BASE_SIZE + (m[1] === '-' ? -n : n))
  return unit === '%' ? BASE_SIZE * n / 100 : unit === 'em' ? BASE_SIZE * n : n
}

function parseLength(value) {
  const m = /^(-?\d*\.?\d+)(px|em)?$/i.exec(value ?? '')
  if (!m) return null
  const n = parseFloat(m[1])
  return (m[2] || 'px').toLowerCase() === 'em' ? `${n}em` : `${n / BASE_SIZE}em`
}

function parseTag(raw) {
  const m = /^<(\/?)(#[0-9a-f]+|[a-z][a-z-]*)(?:\s*=\s*(.*?))?\s*>$/i.exec(raw)
  if (!m) return null
  const close = m[1] === '/'
  let name = m[2].toLowerCase()
  let value = m[3] == null ? null : m[3].replace(/^["']|["']$/g, '')
  if (name.startsWith('#')) {
    if (close) return null
    value = name
    name = 'color'
  }
  return { close, name, value }
}

export class TmpPreview {
  runs = []
  st = { b: 0, i: 0, u: 0, s: 0, sup: 0, sub: 0, alpha: null, noparse: false,
    color: [], mark: [], size: [], letterCase: [], cspace: [], voffset: [] }

  tag(raw) {
    const t = parseTag(raw)
    if (this.st.noparse && !(t && t.close && t.name === 'noparse')) return this.text(raw)
    if (!t || !this.apply(t)) this.text(raw)
  }

  apply({ close, name, value }) {
    const st = this.st
    const push = (key, v) => { if (v == null) return false; st[key].push(v); return true }
    if (close && STACKED.has(name)) { st[name].pop(); return true }
    if (close && CASE_TAGS.has(name)) { st.letterCase.pop(); return true }
    switch (name) {
      case 'b': case 'i': case 'u': case 's': case 'sup': case 'sub':
        st[name] = Math.max(0, st[name] + (close ? -1 : 1))
        return true
      case 'color': return push('color', parseTmpColor(value))
      case 'mark': return push('mark', value == null ? MARK_DEFAULT : parseTmpColor(value))
      case 'size': return push('size', parseSize(value))
      case 'cspace': return push('cspace', parseLength(value))
      case 'voffset': return push('voffset', parseLength(value))
      case 'lowercase': case 'uppercase': case 'allcaps': case 'smallcaps':
        st.letterCase.push(name)
        return true
      case 'alpha': {
        if (close) { st.alpha = null; return true }
        const a = /^#([0-9a-f]{2})$/i.exec(value ?? '')
        if (!a) return false
        st.alpha = parseInt(a[1], 16) / 255
        return true
      }
      case 'noparse': st.noparse = !close; return true
      case 'br': if (!close) this.char('\n'); return true
      default: return TMP_IGNORED.has(name)
    }
  }

  text(str) { for (const c of str) this.char(c) }

  char(c, effectColor) {
    const st = this.st
    const letterCase = st.letterCase.at(-1)
    if (letterCase === 'uppercase' || letterCase === 'allcaps') c = c.toUpperCase()
    else if (letterCase === 'lowercase') c = c.toLowerCase()
    const size = st.size.at(-1)
    const deco = [st.u && 'underline', st.s && 'line-through'].filter(Boolean).join(' ')
    const voffset = st.voffset.at(-1)
    const style = {
      color: effectColor ?? st.color.at(-1),
      backgroundColor: st.mark.at(-1),
      fontSize: size != null ? `${size / BASE_SIZE}em` : undefined,
      lineHeight: size != null ? 1 : undefined,
      fontWeight: st.b ? 700 : undefined,
      fontStyle: st.i ? 'italic' : undefined,
      textDecoration: deco || undefined,
      fontVariant: letterCase === 'smallcaps' ? 'small-caps' : undefined,
      verticalAlign: st.sup ? 'super' : st.sub ? 'sub' : undefined,
      letterSpacing: st.cspace.at(-1),
      position: voffset ? 'relative' : undefined,
      top: voffset ? `calc(-1 * ${voffset})` : undefined,
      opacity: st.alpha ?? undefined,
    }
    const key = JSON.stringify(style)
    const last = this.runs.at(-1)
    if (last && last.key === key) last.text += c
    else this.runs.push({ key, style, text: c })
  }
}

export function tmpRuns(text) {
  const preview = new TmpPreview()
  const re = /<[^>]+>/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    preview.text(text.slice(last, m.index))
    preview.tag(m[0])
    last = re.lastIndex
  }
  preview.text(text.slice(last))
  return preview.runs
}
