import { useEffect, useRef, useState } from 'react'
import { KeycardScene, parseColor } from '../keycard/KeycardScene.js'

// 'default' permission colour renders white in game (checked on a Task Force card)
const DEFAULT_PERM = '#ffffff'

export default function KeycardPreview3D({ fields }) {
  const box = useRef(null)
  const scene = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let s
    try {
      s = new KeycardScene(box.current)
    } catch {
      setStatus('nowebgl')
      return
    }
    scene.current = s
    return () => { s.dispose(); scene.current = null }
  }, [])

  useEffect(() => {
    const s = scene.current
    if (!s) return
    const frame = requestAnimationFrame(() => {
      s.update({
        cardType: fields.cardType,
        tint: parseColor(fields.tintColor, '#ffffff'),
        perm: parseColor(fields.permColor, DEFAULT_PERM),
        labelColor: parseColor(fields.labelColor, '#ffffff'),
        label: fields.label,
        holder: fields.holderName,
        serial: fields.serial,
        rank: fields.rankDetail,
        cont: +fields.contLevel || 0,
        arm: +fields.armoryLevel || 0,
        adm: +fields.adminLevel || 0,
      }).then(() => setStatus('ready'), () => setStatus('error'))
    })
    return () => cancelAnimationFrame(frame)
  }, [fields])

  return (
    <div className="kc-preview">
      <div ref={box} className="kc-preview-canvas" />
      {status === 'loading' && <div className="kc-preview-note">Loading card…</div>}
      {status === 'error' && <div className="kc-preview-note">Couldn't load the card model.</div>}
      {status === 'nowebgl' && <div className="kc-preview-note">3D preview needs WebGL.</div>}
      {status === 'ready' && (
        <button type="button" className="kc-preview-reset" onClick={() => scene.current?.resetView()} title="Reset view">
          <i className="fa-solid fa-rotate-left"></i>
        </button>
      )}
    </div>
  )
}
