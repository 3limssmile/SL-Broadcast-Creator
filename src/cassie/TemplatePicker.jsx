import { useState } from 'react'
import { CAUSES, NATO, SCPS, TEMPLATE_DEFAULTS, TEMPLATES, UNIT_NUMBERS } from './templates.js'

function UnitSelect({ values, set }) {
  return (
    <div className="template-inline">
      <select value={values.nato} onChange={e => set('nato', e.target.value)} aria-label="Unit code">
        {NATO.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={values.number} onChange={e => set('number', Number(e.target.value))} aria-label="Unit number">
        {UNIT_NUMBERS.map(n => <option key={n} value={n}>{String(n).padStart(2, '0')}</option>)}
      </select>
    </div>
  )
}

function NumberField({ id, label, value, min, max, onChange }) {
  return (
    <div className="form-group template-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" min={min} max={max} value={value}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || 0)))} />
    </div>
  )
}

export default function TemplatePicker({ onApply, onListen, playing }) {
  const [templateId, setTemplateId] = useState('ntf')
  const [values, setValues] = useState(TEMPLATE_DEFAULTS)
  const [gameSubtitles, setGameSubtitles] = useState(true)

  const template = TEMPLATES.find(t => t.id === templateId)
  const built = template.build(values)
  const tts = built.tts.replace(/\s+/g, ' ').trim()
  const set = (key, value) => setValues(v => ({ ...v, [key]: value }))
  const toggleVictim = scp => setValues(v => {
    const victims = v.victims.includes(scp) ? v.victims.filter(s => s !== scp) : [...v.victims, scp]
    return { ...v, victims: victims.length ? victims : v.victims }
  })

  return (
    <div className="cassie-templates">
      <div className="template-fields">
        <div className="form-group template-field">
          <label htmlFor="tpl-id">Announcement:</label>
          <select id="tpl-id" value={templateId} onChange={e => setTemplateId(e.target.value)}>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        {template.fields.includes('unit') && (
          <div className="form-group template-field">
            <label>Unit:</label>
            <UnitSelect values={values} set={set} />
          </div>
        )}
        {template.fields.includes('scps') && (
          <NumberField id="tpl-scps" label="SCPs left:" value={values.scps} min={0} max={20} onChange={v => set('scps', v)} />
        )}
        {template.fields.includes('count') && (
          <NumberField id="tpl-count" label="Players spawned:" value={values.count} min={1} max={60} onChange={v => set('count', v)} />
        )}
        {template.fields.includes('seconds') && (
          <NumberField id="tpl-seconds" label="Seconds:" value={values.seconds} min={1} max={999} onChange={v => set('seconds', v)} />
        )}
        {template.fields.includes('victims') && (
          <div className="form-group template-field template-wide">
            <label>Terminated:</label>
            <div className="template-chips">
              {SCPS.map(s => (
                <button key={s} className={values.victims.includes(s) ? 'active' : ''} onClick={() => toggleVictim(s)}>SCP-{s}</button>
              ))}
            </div>
          </div>
        )}
        {template.fields.includes('cause') && (
          <div className="form-group template-field">
            <label htmlFor="tpl-cause">Cause:</label>
            <select id="tpl-cause" value={values.cause} onChange={e => set('cause', e.target.value)}>
              {CAUSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
        {template.fields.includes('cause') && values.cause === 'scp' && (
          <div className="form-group template-field">
            <label htmlFor="tpl-attacker">Killed by:</label>
            <select id="tpl-attacker" value={values.attacker} onChange={e => set('attacker', e.target.value)}>
              {SCPS.map(s => <option key={s} value={s}>SCP-{s}</option>)}
            </select>
          </div>
        )}
        {template.fields.includes('cause') && values.cause === 'unit' && (
          <div className="form-group template-field">
            <label>Unit:</label>
            <UnitSelect values={values} set={set} />
          </div>
        )}
      </div>

      <div className="template-preview">
        <code>{tts}</code>
        {gameSubtitles && <p>{built.subtitle}</p>}
      </div>

      <label className="template-check">
        <input type="checkbox" checked={gameSubtitles} onChange={e => setGameSubtitles(e.target.checked)} />
        Use the game's subtitle text (switches Subtitles to Custom)
      </label>

      <div className="template-actions">
        <button className="btn btn-primary" onClick={() => onApply(tts, gameSubtitles ? built.subtitle : null)}>
          <i className="fa-solid fa-arrow-left"></i> Use template
        </button>
        {playing
          ? <button className="btn btn-secondary" onClick={() => onListen(null)}><i className="fa-solid fa-stop"></i> Stop</button>
          : <button className="btn btn-secondary" onClick={() => onListen(tts)}><i className="fa-solid fa-volume-high"></i> Listen</button>}
      </div>
    </div>
  )
}
