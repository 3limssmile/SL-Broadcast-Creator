import { useEffect, useMemo, useRef, useState } from 'react'
import CopyButton from '../components/CopyButton.jsx'
import { interpret, LINES, WORD } from '../cassie/interpret.js'
import { CassiePlayer } from '../cassie/player.js'
import TemplatePicker from '../cassie/TemplatePicker.jsx'
import { tmpRuns } from '../components/tmpText.js'
import { buildRichText, ColorEffectPicker, RichTextEditor, RichTextRuns } from '../components/RichTextEditor.jsx'

const MODIFIERS = [
  ['$PITCH_0.9', 'Pitch and speed of all following words (0.01 to 15).'],
  ['$VOL_0.5', 'Volume of all following words (0 to 1).'],
  ['$SLEEP_0.3', 'Extra pause before every following word, in seconds.'],
  ['$SPAC_1', 'Time until the word after the next one starts. Next word only.'],
  ['$STARTT_0.1', 'Skip the first seconds of the next word.'],
  ['$MAXDUR_0.4', 'Cut the next word off after this many seconds.'],
  ['$STUTT_0.3_0.13_3', 'Stutter on the next word: from 30% of the clip, repeat 0.13 s, 3 times.'],
  ['.G1 … .G7', 'Glitch sounds.'],
  ['.', 'Half-second pause. A word ending in . or , adds one too.'],
  ['173  3.5  -2', 'Numbers are read out: one hundred seventy three.'],
]

const KIND_TITLES = {
  word: 'Word',
  number: 'Number, read out',
  suffix: 'Word with an ending CASSIE adds on its own',
  modifier: 'Modifier',
  unknown: 'CASSIE doesn\'t know this word. The game skips it.',
}

const SUBTITLE_MODES = [
  ['Automatic', 'Automatic', 'Shows the words CASSIE says.'],
  ['Custom', 'Custom', 'Shows your own text. Colors, sizes and effects work here.'],
  ['None', 'None', 'Nothing is shown on screen.'],
]

const NOISE_MODES = [
  [true, 'On', 'Noise and a 2.5 s lead-in, like in the game.'],
  [false, 'Off', 'Voice only, starts right away.'],
]

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map(([key, label]) => (
        <button key={String(key)} role="radio" aria-checked={value === key}
          className={value === key ? 'active' : ''} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function describe(token, clips) {
  if (token.kind === 'number' || token.kind === 'suffix') {
    return token.clips.map(i => clips[i].line.name).join(' ')
  }
  return null
}

export default function CassieCreator() {
  const [message, setMessage] = useState('ATTENTION ALL PERSONNEL . MTFUNIT EPSILON 11 DESIGNATED NINETAILEDFOX HASENTERED ALLREMAINING')
  const [subtitleMode, setSubtitleMode] = useState('Automatic')
  const [noise, setNoise] = useState(true)
  const [customSubtitle, setCustomSubtitle] = useState('')
  const [effect, setEffect] = useState('none')
  const [colors, setColors] = useState(['#00FF20', '#33E0FF'])
  const [pitch, setPitch] = useState('0.9')
  const [glitch, setGlitch] = useState('.G1')
  const [search, setSearch] = useState('')
  const [playing, setPlaying] = useState(null)
  const [current, setCurrent] = useState(-1)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('words')

  const textareaRef = useRef(null)
  const player = useRef(null)
  const frame = useRef(0)

  const text = message.replace(/\s+/g, ' ').trim()
  const result = useMemo(() => interpret(text, noise), [text, noise])

  const custom = useMemo(() => buildRichText(customSubtitle, effect, colors), [customSubtitle, effect, colors])
  const customText = custom.text.replace(/\s+/g, ' ').trim()
  const customCount = customText ? customText.split(' ').length : 0

  const command = subtitleMode === 'Automatic'
    ? `${noise ? 'cassie' : 'cassie_silent'} ${text}`
    : subtitleMode === 'Custom'
      ? `cassieadvanced Custom ${noise} ${customCount} ${customText} ${text}`.replace(/ +/g, ' ')
      : `cassieadvanced None ${noise} ${text}`

  const autoRuns = useMemo(() => tmpRuns(result.subtitle), [result.subtitle])
  const subtitleRuns = subtitleMode === 'Automatic' ? autoRuns : subtitleMode === 'Custom' ? custom.preview : []

  const unknown = result.tokens.filter(t => t.kind === 'unknown').length
  const subtitleHint = SUBTITLE_MODES.find(m => m[0] === subtitleMode)[2]
  const noiseHint = NOISE_MODES.find(m => m[0] === noise)[2]

  const shownTab = tab === 'subtitles' && subtitleMode !== 'Custom' ? 'words' : tab

  const words = useMemo(() => {
    const q = search.trim().toUpperCase()
    return q ? LINES.filter(l => l.name.includes(q)) : LINES
  }, [search])

  useEffect(() => {
    player.current = new CassiePlayer()
    return () => { cancelAnimationFrame(frame.current); player.current.dispose() }
  }, [])

  const chooseSubtitles = mode => {
    if (mode === 'Custom' && !customSubtitle.trim()) setCustomSubtitle(result.subtitle)
    if (mode === 'Custom') setTab('subtitles')
    setSubtitleMode(mode)
  }

  const applyTemplate = (tts, subtitle) => {
    setMessage(tts)
    if (subtitle != null) {
      setCustomSubtitle(subtitle)
      setEffect('none')
      setSubtitleMode('Custom')
    }
  }

  const listenTemplate = tts => {
    if (tts == null) { stop(); return }
    start(interpret(tts, noise), noise, 'template')
  }

  const stop = () => {
    cancelAnimationFrame(frame.current)
    player.current.stop()
    setPlaying(null)
    setCurrent(-1)
  }

  const start = async (res, background, kind) => {
    stop()
    setError('')
    setPlaying(kind)
    let timing
    try {
      timing = await player.current.play(res, background)
    } catch {
      setPlaying(null)
      setError('Couldn\'t load or play the audio. Your browser may not support Ogg Vorbis.')
      return
    }
    if (!timing) return
    const tick = () => {
      const now = player.current.now()
      if (now >= timing.end) { setPlaying(null); setCurrent(-1); return }
      if (kind === 'message') {
        const t = now - timing.origin
        let idx = -1
        res.tokens.forEach((tok, i) => { if (tok.clips.length && tok.start <= t) idx = i })
        setCurrent(idx)
      }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  const insert = (token) => {
    const ta = textareaRef.current
    const startPos = ta ? ta.selectionStart : message.length
    const endPos = ta ? ta.selectionEnd : message.length
    const before = message.slice(0, startPos)
    const after = message.slice(endPos)
    const pre = before && !/\s$/.test(before) ? ' ' : ''
    const post = after && !/^\s/.test(after) ? ' ' : ''
    const next = before + pre + token + post + after
    setMessage(next)
    const caret = (before + pre + token + post).length
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = ta.selectionEnd = caret
    })
  }

  return (
    <div className="content-wrapper" style={{ minHeight: 0 }}>
      <div className="card header-card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px' }}>
        <h2 style={{ marginBottom: 2, fontSize: '1.2rem' }}>SCP:SL CASSIE Announcements</h2>
        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Write a CASSIE announcement, hear it with the voice lines from the game and copy the Remote Admin command.
        </p>
      </div>

      <div className="card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px 15px' }}>
        <h3 style={{ marginBottom: 5, paddingBottom: 5 }}>
          <i className="fa-solid fa-eye"></i> Subtitle Preview
        </h3>
        <div className="preview-box cassie-preview">
          {subtitleRuns.length
            ? <div className="cassie-subtitle"><span className="cassie-subtitle-prefix">C.A.S.S.I.E :</span> <RichTextRuns runs={subtitleRuns} /></div>
            : <span className="text-muted">No subtitles on screen</span>}
        </div>
      </div>

      <div className="grid-container cassie-grid" style={{ flex: 1, minHeight: 0 }}>
        <div className="grid-column">
          <div className="card" style={{ flex: 1, minHeight: 0, marginBottom: 0 }}>
            <h3><i className="fa-solid fa-bullhorn"></i> Announcement</h3>
            <div className="form-row" style={{ marginBottom: 10, gap: 15, flexShrink: 0 }}>
              <div className="form-group" style={{ flex: 3, marginBottom: 0 }}>
                <label>Subtitles:</label>
                <Segmented options={SUBTITLE_MODES} value={subtitleMode} onChange={chooseSubtitles} />
                <p className="setting-hint">{subtitleHint}</p>
              </div>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label>Background noise:</label>
                <Segmented options={NOISE_MODES} value={noise} onChange={setNoise} />
                <p className="setting-hint">{noiseHint}</p>
              </div>
            </div>

            <label style={{ flexShrink: 0 }}>Message:</label>
            <div className="format-toolbar" style={{ flexShrink: 0 }}>
              <div className="format-tool-group">
                <label style={{ margin: 0, fontSize: '0.75rem' }}>Pitch:</label>
                <input type="number" step="0.05" min="0.01" max="15" value={pitch} onChange={e => setPitch(e.target.value)}
                  className="toolbar-text-input no-spin" style={{ width: 50, height: 20, textAlign: 'center' }} />
                <button className="format-btn" title="Insert pitch change" onClick={() => insert(`$PITCH_${pitch || 1}`)}>
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
              <div className="format-tool-group">
                <label style={{ margin: 0, fontSize: '0.75rem' }}>Glitch:</label>
                <select value={glitch} onChange={e => setGlitch(e.target.value)} className="cassie-mini-select">
                  {['.G1', '.G2', '.G3', '.G4', '.G5', '.G6', '.G7'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button className="format-btn" title="Insert glitch" onClick={() => insert(glitch)}>
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
              <button className="format-btn" title="Stutter on the next word" onClick={() => insert('$STUTT_0.3_0.13_3')}>Stutter</button>
              <button className="format-btn" title="Half-second pause" onClick={() => insert('.')}>Pause</button>
            </div>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              spellCheck={false}
              style={{ flex: '0 0 80px', minHeight: 80, fontFamily: 'monospace', textTransform: 'uppercase' }}
            />

            <div className="cassie-player">
              {playing === 'message'
                ? <button className="btn btn-secondary" onClick={stop}><i className="fa-solid fa-stop"></i> Stop</button>
                : <button className="btn btn-primary" onClick={() => start(result, noise, 'message')} disabled={!result.clips.length}>
                    <i className="fa-solid fa-play"></i> Play
                  </button>}
              <span className="text-muted cassie-stats">
                {result.duration.toFixed(1)} s
                {unknown > 0 && <span className="cassie-warn"> · {unknown} unknown {unknown === 1 ? 'word' : 'words'} skipped</span>}
              </span>
            </div>
            {error && <p className="cassie-error">{error}</p>}

            <div className="cassie-tokens">
              {result.tokens.map((tok, i) => {
                const detail = describe(tok, result.clips)
                const title = tok.hint
                  ? `Old syntax, the game skips it. Use ${tok.hint} instead.`
                  : tok.kind === 'unknown' && tok.text.includes('<')
                    ? 'Rich text tags don\'t work in the message, the game skips them. Set Subtitles to Custom and put the tags there.'
                    : KIND_TITLES[tok.kind] + (detail ? `: ${detail}` : '')
                return (
                  <span key={i} className={`cassie-token cassie-${tok.kind}${i === current ? ' active' : ''}`} title={title}>
                    {tok.text}
                    {detail && <small>{detail}</small>}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid-column">
          <div className="card" style={{ flex: 1, minHeight: 0, marginBottom: 0 }}>
            <div className="card-tabs" role="tablist">
              {[
                ['words', 'fa-book', `Words (${LINES.length})`],
                ['templates', 'fa-scroll', 'Templates'],
                ...(subtitleMode === 'Custom' ? [['subtitles', 'fa-closed-captioning', 'Custom Subtitles']] : []),
              ].map(([key, icon, label]) => (
                <button key={key} role="tab" aria-selected={shownTab === key} className={shownTab === key ? 'active' : ''} onClick={() => setTab(key)}>
                  <i className={`fa-solid ${icon}`}></i> {label}
                </button>
              ))}
            </div>

            {shownTab === 'templates' && (
              <TemplatePicker onApply={applyTemplate} onListen={listenTemplate} playing={playing === 'template'} />
            )}
            {shownTab === 'subtitles' && (
              <div className="cassie-custom">
                <label htmlFor="cassie-custom">Text shown on screen:</label>
                <RichTextEditor id="cassie-custom" value={customSubtitle} onChange={setCustomSubtitle}
                  placeholder="Text shown on screen" style={{ flex: '0 0 72px', minHeight: 72 }} />
                <div style={{ marginTop: 10 }}>
                  <ColorEffectPicker id="cassie-effect" effect={effect} setEffect={setEffect} colors={colors} setColors={setColors} maxHeight={120} />
                </div>
              </div>
            )}
            {shownTab === 'words' && (<>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ padding: '8px 12px', marginBottom: 8, flexShrink: 0 }} />
            <div className="cassie-words">
              {words.map(l => (
                <span key={l.id} className={`cassie-word${l.type !== WORD ? ' special' : ''}`}>
                  <button className="cassie-word-insert" onClick={() => insert(l.name)} title="Insert">{l.name}</button>
                  <button className="cassie-word-play" onClick={() => start(interpret(l.name, false), false, 'word')} title="Listen">
                    <i className="fa-solid fa-volume-high"></i>
                  </button>
                </span>
              ))}
              {!words.length && <span className="text-muted">No matching words.</span>}
            </div>
            <details className="cassie-help">
              <summary>Modifiers and special words</summary>
              <table>
                <tbody>
                  {MODIFIERS.map(([code, desc]) => (
                    <tr key={code}><td><code>{code}</code></td><td>{desc}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
            <p className="text-muted kc-credit">
              Voice lines from{' '}
              <a href="https://scpslgame.com/" target="_blank" rel="noreferrer">SCP: Secret Laboratory</a>{' '}
              by Northwood Studios,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.
            </p>
            </>)}
          </div>
        </div>
      </div>

      <div className="card output-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
        <h3 style={{ marginBottom: 10, paddingBottom: 5 }}>
          <i className="fa-terminal fa-solid"></i> Remote Admin Command
        </h3>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ marginBottom: 8 }}>Paste this in RA console:</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <textarea
              readOnly
              value={command}
              style={{
                flexGrow: 1, resize: 'none', height: 45, minHeight: 45,
                fontFamily: 'monospace', fontSize: '1rem', color: '#4ade80',
                backgroundColor: '#000', padding: '10px 15px',
                whiteSpace: 'nowrap', overflowX: 'auto', overflowY: 'hidden',
              }}
            />
            <CopyButton getValue={() => command} style={{ flexShrink: 0, height: 45 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
