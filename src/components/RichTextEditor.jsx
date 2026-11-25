import { useCallback, useRef, useState } from 'react'
import { TmpPreview } from './tmpText.js'

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null
}

function rgbToHex(r, g, b) {
  return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()
}

function interpolateColor(c1, c2, factor) {
  return {
    r: Math.round(c1.r + factor * (c2.r - c1.r)),
    g: Math.round(c1.g + factor * (c2.g - c1.g)),
    b: Math.round(c1.b + factor * (c2.b - c1.b)),
  }
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase()
}

function hslToHex(h, s, l) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

function parseTextIntoTokens(text) {
  const regex = /(<[^>]+>)/g
  const tokens = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      for (const char of text.substring(lastIndex, match.index)) {
        tokens.push({ type: 'text', value: char })
      }
    }
    tokens.push({ type: 'tag', value: match[0] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    for (const char of text.substring(lastIndex)) {
      tokens.push({ type: 'text', value: char })
    }
  }
  return tokens
}

export function buildRichText(rawText, effect, colors) {
  const text = rawText.replace(/\\n/g, '\n')
  if (!text) return { text: '', preview: [] }

  const tokens = parseTextIntoTokens(text)
  let colorableLength = 0
  for (const t of tokens) { if (t.type === 'text') colorableLength++ }

  const charColors = []
  if (effect !== 'none' && colorableLength > 0) {
    if (effect === 'rainbow') {
      for (let i = 0; i < colorableLength; i++) {
        charColors.push(hslToHex((i / Math.max(1, colorableLength - 1)) * 360, 100, 50))
      }
    } else if (effect === 'random') {
      for (let i = 0; i < colorableLength; i++) charColors.push(getRandomColor())
    } else if (effect === 'randomWord') {
      let wordColor = getRandomColor()
      let idx = 0
      for (const t of tokens) {
        if (t.type === 'text') {
          if (t.value === ' ' || t.value === '\n') wordColor = getRandomColor()
          charColors[idx++] = wordColor
        }
      }
    } else {
      const safeColors = colors.length >= 2 ? colors : ['#ffffff', '#ffffff']
      const segments = safeColors.length - 1
      for (let i = 0; i < colorableLength; i++) {
        if (colorableLength <= 1) { charColors.push(safeColors[0].toUpperCase()); continue }
        const percent = i / (colorableLength - 1)
        const segIdx = Math.min(Math.floor(percent * segments), segments - 1)
        const c1 = hexToRgb(safeColors[segIdx])
        const c2 = hexToRgb(safeColors[segIdx + 1])
        const rangeStart = segIdx / segments
        const rangeEnd = (segIdx + 1) / segments
        const localFactor = (percent - rangeStart) / (rangeEnd - rangeStart)
        const blended = interpolateColor(c1, c2, localFactor)
        charColors.push(rgbToHex(blended.r, blended.g, blended.b))
      }
    }
  }

  let unityOut = ''
  const preview = new TmpPreview()
  let colorIndex = 0

  for (const t of tokens) {
    if (t.type === 'tag') {
      unityOut += t.value
      preview.tag(t.value)
    } else {
      const char = t.value
      if (char === '\n') {
        unityOut += '\\n'
        preview.char('\n')
      } else if (char === ' ') {
        unityOut += ' '
        preview.char(' ')
      } else if (effect !== 'none') {
        const col = charColors[colorIndex]
        unityOut += `<color=${col}>${char}</color>`
        preview.char(char, col)
      } else {
        unityOut += char
        preview.char(char)
      }
      colorIndex++
    }
  }

  return { text: unityOut, preview: preview.runs }
}

export function RichTextEditor({ id, value, onChange, style, placeholder }) {
  const [sizeVal, setSizeVal] = useState(45)
  const [colorHex, setColorHex] = useState('#00FF20')
  const textareaRef = useRef(null)

  const wrapSelection = useCallback((startTag, endTag) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = ta.value.substring(0, start)
    const selected = ta.value.substring(start, end)
    const after = ta.value.substring(end)
    onChange(before + startTag + selected + endTag + after)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + startTag.length
      ta.selectionEnd = start + startTag.length + selected.length
    })
  }, [onChange])

  return (
    <>
      <div className="format-toolbar">
        <button className="format-btn" title="Bold" onClick={() => wrapSelection('<b>', '</b>')}><b>B</b></button>
        <button className="format-btn" title="Italic" onClick={() => wrapSelection('<i>', '</i>')}><i>I</i></button>
        <button className="format-btn" title="Underline" onClick={() => wrapSelection('<u>', '</u>')}><u>U</u></button>
        <button className="format-btn" title="Strikethrough" onClick={() => wrapSelection('<s>', '</s>')}><s>S</s></button>
        <button className="format-btn" title="Marker" onClick={() => wrapSelection('<mark>', '</mark>')}>Mark</button>

        <div className="toolbar-separator" />

        <div className="format-tool-group">
          <label style={{ margin: 0, fontSize: '0.75rem' }}>Size:</label>
          <input
            type="range" min={15} max={178} value={sizeVal}
            onChange={e => setSizeVal(parseInt(e.target.value))}
          />
          <input
            type="number" min={1} max={178} value={sizeVal}
            className="toolbar-text-input no-spin"
            style={{ width: 35, height: 20, textAlign: 'center' }}
            onChange={e => { const v = Math.min(Math.max(parseInt(e.target.value) || 45, 1), 178); setSizeVal(v) }}
          />
          <button className="format-btn" title="Apply Size" onClick={() => wrapSelection(`<size=${sizeVal}>`, '</size>')}>
            <i className="fa-solid fa-text-height"></i>
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="format-tool-group">
          <label style={{ margin: 0, fontSize: '0.75rem' }}>Color:</label>
          <input
            type="color" value={colorHex}
            className="toolbar-color-picker"
            style={{ width: 20, height: 20 }}
            onChange={e => setColorHex(e.target.value.toUpperCase())}
          />
          <input
            type="text" value={colorHex} maxLength={7}
            className="toolbar-text-input"
            style={{ width: 70, height: 20, textTransform: 'uppercase' }}
            onChange={e => setColorHex(e.target.value)}
          />
          <button className="format-btn" title="Apply Color" onClick={() => wrapSelection(`<color=${colorHex}>`, '</color>')}>
            <i className="fa-solid fa-palette"></i>
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ flexGrow: 1, resize: 'none', marginBottom: 0, minHeight: 0, overflowY: 'auto', ...style }}
      />
    </>
  )
}

export function ColorEffectPicker({ id, effect, setEffect, colors, setColors, maxHeight = 140 }) {
  const updateColor = (i, val) => setColors(prev => { const c = [...prev]; c[i] = val; return c })
  const addColor = () => setColors(prev => [...prev, '#ffffff'])
  const removeColor = i => setColors(prev => prev.filter((_, idx) => idx !== i))

  return (
    <>
      <div className="form-group" style={{ marginBottom: 10 }}>
        <label htmlFor={id}>Effect Type:</label>
        <select id={id} value={effect} onChange={e => setEffect(e.target.value)} style={{ padding: '8px 12px' }}>
          <option value="none">None</option>
          <option value="gradient">Gradient</option>
          <option value="rainbow">Rainbow</option>
          <option value="random">Random Letters</option>
          <option value="randomWord">Random Words</option>
        </select>
      </div>

      {effect === 'gradient' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, maxHeight, overflowY: 'auto' }}>
            {colors.map((col, i) => (
              <div key={i} className="color-stop-row">
                <input type="color" value={col} onChange={e => updateColor(i, e.target.value)} />
                <span className="color-info">{col.toUpperCase()}</span>
                {colors.length > 2 && (
                  <button className="remove-color-btn" onClick={() => removeColor(i)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={addColor} style={{ width: '100%', padding: '8px 15px' }}>
            <i className="fa-solid fa-plus"></i> Add Color
          </button>
        </>
      )}
    </>
  )
}

export function RichTextRuns({ runs }) {
  return runs.map((r, i) => <span key={i} style={r.style}>{r.text}</span>)
}
