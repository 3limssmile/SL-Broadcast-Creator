import { useMemo, useState } from 'react'
import CopyButton from '../components/CopyButton.jsx'
import { BASE_SIZE } from '../components/tmpText.js'
import { isHexColor, shareUrl, useShared } from '../components/share.js'
import { buildRichText, ColorEffectPicker, RichTextEditor, RichTextRuns } from '../components/RichTextEditor.jsx'

const DEFAULTS = { text: 'Hello SCP:SL Server!', time: 10, effect: 'none', colors: ['#00FF20', '#33E0FF'] }
const RULES = {
  time: v => Number.isInteger(v) && v >= 1 && v <= 300,
  effect: ['none', 'gradient', 'rainbow', 'random', 'randomWord'],
  colors: v => v.length >= 2 && v.every(isHexColor),
}

export default function BroadcastCreator() {
  const shared = useShared(DEFAULTS, RULES)
  const [text, setText] = useState(shared.text)
  const [time, setTime] = useState(shared.time)
  const [effect, setEffect] = useState(shared.effect)
  const [colors, setColors] = useState(shared.colors)

  const built = useMemo(() => buildRichText(text, effect, colors), [text, effect, colors])
  const command = `bc ${time} ${built.text}`

  return (
    <div className="content-wrapper">
      <div className="card header-card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px' }}>
        <h2 style={{ marginBottom: 2, fontSize: '1.2rem' }}>SCP:SL Rich Text Broadcasts</h2>
        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Create beautiful gradient broadcasts or format standard text for Remote Admin.
        </p>
      </div>

      <div className="card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px 15px' }}>
        <h3 style={{ marginBottom: 5, paddingBottom: 5 }}>
          <i className="fa-solid fa-eye"></i> Visual Preview
        </h3>
        <div className="preview-box">
          <div style={{ whiteSpace: 'pre-wrap', fontSize: BASE_SIZE, lineHeight: 1.15 }}>
            {built.preview.length ? <RichTextRuns runs={built.preview} /> : 'Hello SCP:SL Server!'}
          </div>
        </div>
      </div>

      <div className="grid-container" style={{ flex: 1, minHeight: 0 }}>
        <div className="grid-column">
          <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
            <h3><i className="fa-solid fa-pen-nib"></i> Broadcast Settings</h3>

            <div className="form-row" style={{ flexShrink: 0, marginBottom: 10 }}>
              <div className="form-group" style={{ flex: '0 0 150px', marginBottom: 0 }}>
                <label htmlFor="bc-time">Time (Seconds):</label>
                <input
                  id="bc-time"
                  type="number"
                  value={time}
                  min={1} max={300}
                  onChange={e => setTime(parseInt(e.target.value) || 10)}
                  style={{ padding: '8px 12px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: 0, minHeight: 0 }}>
              <label>Text Content:</label>
              <RichTextEditor id="bc-text" value={text} onChange={setText} />
            </div>
          </div>
        </div>

        <div className="grid-column">
          <div className="card" style={{ flexShrink: 0, marginBottom: 0 }}>
            <h3><i className="fa-solid fa-fill-drip"></i> Color Effect</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
              Applies a color effect across the entire text above. It will safely ignore your inline formatting tags.
            </p>
            <ColorEffectPicker id="bc-effect" effect={effect} setEffect={setEffect} colors={colors} setColors={setColors} />
          </div>

          <div className="card output-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: 0, minHeight: 0 }}>
            <h3><i className="fa-terminal fa-solid"></i> Remote Admin Command</h3>
            <div className="form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: 0, minHeight: 0 }}>
              <label style={{ flexShrink: 0, marginBottom: 8 }}>Paste this in RA console:</label>
              <div className="output-row">
                <textarea
                  readOnly
                  value={command}
                  style={{ flexGrow: 1, resize: 'none', overflowY: 'auto', minHeight: 0, fontFamily: 'monospace', fontSize: '1rem', color: '#4ade80', backgroundColor: '#000', padding: '12px 15px' }}
                />
                <div className="output-buttons">
                  <CopyButton getValue={() => command} />
                  <CopyButton getValue={() => shareUrl('/broadcast', { text, time, effect, colors }, DEFAULTS)}
                    className="btn btn-secondary" label="Copy Link" copiedLabel="Link copied!" icon="fa-link"
                    title="Link that opens this page with your text and settings" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
