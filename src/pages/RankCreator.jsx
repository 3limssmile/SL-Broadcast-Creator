import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import CopyButton from '../components/CopyButton.jsx'
import { buildConfig, findProblems, ID_PATTERN, parseConfig } from '../ranks/config.js'
import { BADGE_COLORS, COLOR_HEX, isRestricted, PERMISSION_GROUPS, PERMISSIONS, RESTRICTED_COLORS, SETTINGS, TEMPLATE } from '../ranks/data.js'

const UNITS = [
  { value: 31536000, label: 'years' },
  { value: 86400, label: 'days' },
  { value: 3600, label: 'hours' },
  { value: 60, label: 'minutes' },
  { value: 1, label: 'seconds' },
]

const TABS = [
  { id: 'rank', label: 'Rank', icon: 'fa-id-badge' },
  { id: 'members', label: 'Members', icon: 'fa-users' },
  { id: 'settings', label: 'Settings', icon: 'fa-sliders' },
  { id: 'bans', label: 'Ban templates', icon: 'fa-gavel' },
]

function encodeState(state) {
  const { override_password, ...settings } = state.settings
  const bytes = new TextEncoder().encode(JSON.stringify({ ...state, settings }))
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeState(raw) {
  try {
    const bin = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))))
    const byte = (n, d) => (Number.isInteger(n) && n >= 0 && n <= 255 ? n : d)
    const ranks = (json.ranks || []).map(r => ({
      key: String(r.key ?? ''), badge: String(r.badge ?? ''), color: String(r.color ?? 'default'),
      cover: r.cover !== false, hidden: r.hidden === true, kick: byte(r.kick, 0), required: byte(r.required, 0),
      perms: PERMISSIONS.filter(p => (r.perms || []).includes(p)),
    }))
    const members = (json.members || []).map(m => ({ id: String(m.id ?? ''), rank: String(m.rank ?? '') }))
    const settings = { ...TEMPLATE.settings }
    for (const s of SETTINGS) if (typeof json.settings?.[s.key] === 'boolean') settings[s.key] = json.settings[s.key]
    if (typeof json.settings?.override_password_role === 'string') settings.override_password_role = json.settings.override_password_role
    const bans = (json.bans || []).filter(b => Array.isArray(b) && Number.isInteger(b[0])).map(b => [b[0], String(b[1] ?? '')])
    return { ranks, members, settings, bans }
  } catch {
    return null
  }
}

function initialState(search) {
  const raw = new URLSearchParams(search).get('s')
  return (raw && decodeState(raw)) || structuredClone(TEMPLATE)
}

function Badge({ rank }) {
  if (rank.color === 'none') return <span className="rk-badge rk-badge-none">no badge</span>
  return <span className="rk-badge" style={{ color: COLOR_HEX[rank.color] ?? '#fff' }}>{rank.badge || '(empty)'}</span>
}

function visibleBadge(rank) {
  const text = rank.badge
  if (rank.color === 'none' || !text.trim() || text === 'default' || isRestricted(rank.color) || /[[\]<>]/.test(text)) return null
  return { text, hex: COLOR_HEX[rank.color] ?? '#FFFFFF' }
}

function BadgePreview({ rank }) {
  const [shown, setShown] = useState(false)
  const badge = visibleBadge(rank)
  const visible = badge && (!rank.hidden || shown)
  return (
    <div className="rk-preview">
      <div className="rk-pl">
        <div className="rk-pl-head">
          <span>Username</span>
          {visible && <span>Badge</span>}
          <span>Actions</span>
        </div>
        <div className="rk-pl-row">
          <span style={visible ? { color: badge.hex } : undefined}>Bob</span>
          {visible && <span style={{ color: badge.hex }}>{badge.text}</span>}
          <span className="rk-pl-actions"><i className="fa-solid fa-triangle-exclamation"></i><i className="fa-solid fa-volume-high"></i></span>
        </div>
      </div>
      <div className="rk-look">
        {visible && <div style={{ color: badge.hex }}>{badge.text}</div>}
        <div>Bob</div>
        <div>Scientist</div>
      </div>
      {badge && rank.hidden && (
        <div className="segmented rk-preview-toggle">
          <button type="button" className={!shown ? 'active' : ''} onClick={() => setShown(false)}>Hidden</button>
          <button type="button" className={shown ? 'active' : ''} onClick={() => setShown(true)}>After showtag</button>
        </div>
      )}
      {!badge && <div className="rk-preview-note">No badge is shown with these settings.</div>}
    </div>
  )
}

function ColorSwatch({ color, active, onClick, locked }) {
  return (
    <button type="button" className={`rk-swatch ${active ? 'active' : ''} ${locked ? 'locked' : ''}`} onClick={onClick}
      title={locked ? `${color.name}: reserved for global badges, not shown on local ranks` : color.name}>
      <span style={{ background: color.hex }}>{locked && <i className="fa-solid fa-lock"></i>}</span>
      {color.name}
    </button>
  )
}

function RankEditor({ rank, ranks, update }) {
  const canKick = ranks.filter(r => r.key && r.required <= rank.kick).map(r => r.key)
  const kickedBy = ranks.filter(r => r.key && r.kick >= rank.required && r !== rank).map(r => r.key)
  const toggle = p => update({ perms: rank.perms.includes(p) ? rank.perms.filter(x => x !== p) : [...rank.perms, p] })
  return (
    <>
      <BadgePreview rank={rank} />

      <div className="rk-row">
        <div className="form-group rk-field">
          <label htmlFor="rk-key">Rank ID</label>
          <input id="rk-key" type="text" value={rank.key} placeholder="moderator"
            onChange={e => update({ key: e.target.value.replace(/\s+/g, '_') })} />
          <div className="setting-hint">Used in the config only. Players never see it.</div>
        </div>
        <div className="form-group rk-field">
          <label htmlFor="rk-badge">Badge text</label>
          <input id="rk-badge" type="text" value={rank.badge} placeholder="MODERATOR" onChange={e => update({ badge: e.target.value })} />
          <div className="setting-hint">Shown next to the player's name.</div>
        </div>
      </div>

      <div className="form-group rk-field">
        <label>Badge color</label>
        <div className="rk-swatches">
          {BADGE_COLORS.map(c => (
            <ColorSwatch key={c.name} color={c} active={rank.color === c.name} onClick={() => update({ color: c.name })} />
          ))}
          <button type="button" className={`rk-swatch ${rank.color === 'none' ? 'active' : ''}`} onClick={() => update({ color: 'none' })}
            title="Gives the permissions without showing a badge">
            <span className="rk-swatch-none"><i className="fa-solid fa-eye-slash"></i></span>none
          </button>
        </div>
        <details className="rk-restricted">
          <summary>Reserved colors</summary>
          <div className="rk-swatches">
            {RESTRICTED_COLORS.map(c => (
              <ColorSwatch key={c.name} color={c} locked active={rank.color === c.name} onClick={() => update({ color: c.name })} />
            ))}
          </div>
          <div className="setting-hint">The game keeps these for global badges. A local rank in one of them gets no visible badge.</div>
        </details>
      </div>

      <div className="rk-row">
        <label className="rk-check">
          <input type="checkbox" checked={rank.cover} onChange={e => update({ cover: e.target.checked })} />
          <span>Cover<small>Shown instead of the player's global badge, unless they prefer global badges in their settings.</small></span>
        </label>
        <label className="rk-check">
          <input type="checkbox" checked={rank.hidden} onChange={e => update({ hidden: e.target.checked })} />
          <span>Hidden by default<small>Players show it with "showtag", or by setting badges to always visible.</small></span>
        </label>
      </div>

      <div className="rk-row">
        <div className="form-group rk-field">
          <label htmlFor="rk-kick">Kick power</label>
          <input id="rk-kick" type="number" min={0} max={255} value={rank.kick}
            onChange={e => update({ kick: Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)) })} />
          <div className="setting-hint">Can kick and ban: {canKick.length ? canKick.join(', ') : 'nobody with a rank'}.</div>
        </div>
        <div className="form-group rk-field">
          <label htmlFor="rk-required">Required kick power</label>
          <input id="rk-required" type="number" min={0} max={255} value={rank.required}
            onChange={e => update({ required: Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)) })} />
          <div className="setting-hint">Can be kicked and banned by: {kickedBy.length ? kickedBy.join(', ') : 'no other rank'}.</div>
        </div>
      </div>

      <div className="rk-perms-head">
        <label>Permissions <span className="text-muted">({rank.perms.length} of {PERMISSIONS.length})</span></label>
        <div>
          <button type="button" className="rk-link" onClick={() => update({ perms: [...PERMISSIONS] })}>All</button>
          <button type="button" className="rk-link" onClick={() => update({ perms: [] })}>None</button>
        </div>
      </div>
      {PERMISSION_GROUPS.map(g => (
        <div key={g.name} className="rk-perm-group">
          <div className="rk-perm-group-name">{g.name}</div>
          <div className="rk-perms">
            {g.perms.map(([name, desc, danger]) => (
              <label key={name} className={`rk-perm ${rank.perms.includes(name) ? 'on' : ''}`}>
                <input type="checkbox" checked={rank.perms.includes(name)} onChange={() => toggle(name)} />
                <span>
                  <code>{name}</code>{danger && <i className="fa-solid fa-triangle-exclamation rk-danger" title="Dangerous"></i>}
                  <small>{desc}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function MembersEditor({ members, ranks, setMembers }) {
  const update = (i, patch) => setMembers(members.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  return (
    <>
      <p className="rk-intro">
        Players who get a rank as soon as they join. Use their SteamID64 with <code>@steam</code> or Discord ID with <code>@discord</code>.
        This only works with <code>online_mode: true</code> in <code>config_gameplay.txt</code>, because offline players have no verified user ID.
      </p>
      {members.length === 0 && <p className="text-muted rk-empty">No members yet.</p>}
      {members.map((m, i) => (
        <div key={i} className="rk-member">
          <input type="text" value={m.id} placeholder="76561198000000000@steam" aria-label="User ID"
            className={m.id.trim() && !ID_PATTERN.test(m.id.trim()) ? 'rk-invalid' : ''}
            onChange={e => update(i, { id: e.target.value.trim() })} />
          <select value={m.rank} onChange={e => update(i, { rank: e.target.value })} aria-label="Rank">
            {!ranks.some(r => r.key === m.rank) && <option value={m.rank}>{m.rank || '(none)'}</option>}
            {ranks.map(r => <option key={r.key} value={r.key}>{r.key}</option>)}
          </select>
          <button type="button" className="rk-icon-btn" title="Remove" onClick={() => setMembers(members.filter((_, j) => j !== i))}>
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary rk-add" onClick={() => setMembers([...members, { id: '', rank: ranks[ranks.length - 1]?.key ?? '' }])}>
        <i className="fa-solid fa-plus"></i>Add member
      </button>
    </>
  )
}

function SettingsEditor({ settings, ranks, setSettings }) {
  return (
    <>
      {SETTINGS.map(s => (
        <label key={s.key} className="rk-check rk-setting">
          <input type="checkbox" checked={settings[s.key]} onChange={e => setSettings({ ...settings, [s.key]: e.target.checked })} />
          <span>{s.label}{s.danger && <i className="fa-solid fa-triangle-exclamation rk-danger"></i>}<small><code>{s.key}</code>{s.note && ` · ${s.note}`}</small></span>
        </label>
      ))}
      <div className="form-group rk-field rk-password">
        <label htmlFor="rk-pass-role">Override password rank</label>
        <select id="rk-pass-role" value={settings.override_password_role}
          onChange={e => setSettings({ ...settings, override_password_role: e.target.value })}>
          {!ranks.some(r => r.key === settings.override_password_role) && <option value={settings.override_password_role}>{settings.override_password_role}</option>}
          {ranks.map(r => <option key={r.key} value={r.key}>{r.key}</option>)}
        </select>
        <div className="setting-hint">
          The override password is {settings.override_password && settings.override_password !== 'none' ? 'set (kept from your import, never put in share links)' : 'disabled'}.
          The game itself recommends user IDs in Members instead.
        </div>
      </div>
    </>
  )
}

function BansEditor({ bans, setBans }) {
  const update = (i, value) => setBans(bans.map((b, j) => (j === i ? value : b)))
  return (
    <>
      <p className="rk-intro">Quick ban buttons in the GUI Remote Admin. A duration of 0 kicks the player. The game rounds durations down to whole minutes.</p>
      {bans.map(([seconds, reason], i) => {
        const unit = UNITS.find(u => seconds % u.value === 0 && seconds >= u.value) ?? UNITS[4]
        return (
          <div key={i} className="rk-ban">
            <input type="number" min={0} value={seconds / unit.value} aria-label="Duration"
              onChange={e => update(i, [Math.max(0, parseInt(e.target.value, 10) || 0) * unit.value, reason])} />
            <select value={unit.value} aria-label="Unit"
              onChange={e => update(i, [(seconds / unit.value) * Number(e.target.value), reason])}>
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <input type="text" value={reason} placeholder="Reason" aria-label="Reason"
              className={reason.includes(',') ? 'rk-invalid' : ''} onChange={e => update(i, [seconds, e.target.value])} />
            <button type="button" className="rk-icon-btn" title="Remove" onClick={() => setBans(bans.filter((_, j) => j !== i))}>
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
        )
      })}
      <button type="button" className="btn btn-secondary rk-add" onClick={() => setBans([...bans, [3600, '']])}>
        <i className="fa-solid fa-plus"></i>Add template
      </button>
      <div className="setting-hint">Reasons cannot contain commas.</div>
    </>
  )
}

export default function RankCreator() {
  const { search } = useLocation()
  const initial = useMemo(() => initialState(search), [])
  const [ranks, setRanks] = useState(initial.ranks)
  const [members, setMembers] = useState(initial.members)
  const [settings, setSettings] = useState(initial.settings)
  const [bans, setBans] = useState(initial.bans)
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState('rank')
  const [importing, setImporting] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  const state = { ranks, members, settings, bans }
  const config = useMemo(() => buildConfig(state), [ranks, members, settings, bans])
  const problems = useMemo(() => findProblems(state), [ranks, members, settings, bans])
  const rank = ranks[selected]

  const updateRank = patch => {
    const before = ranks[selected]
    setRanks(ranks.map((r, i) => (i === selected ? { ...r, ...patch } : r)))
    if ('key' in patch && before.key) {
      setMembers(members.map(m => (m.rank === before.key ? { ...m, rank: patch.key } : m)))
      if (settings.override_password_role === before.key) setSettings({ ...settings, override_password_role: patch.key })
    }
  }

  const addRank = () => {
    let n = ranks.length + 1
    while (ranks.some(r => r.key === `rank${n}`)) n++
    setRanks([...ranks, { key: `rank${n}`, badge: 'NEW RANK', color: 'cyan', cover: true, hidden: false, kick: 0, required: 0, perms: [] }])
    setSelected(ranks.length)
    setTab('rank')
  }

  const removeRank = i => {
    setRanks(ranks.filter((_, j) => j !== i))
    setSelected(Math.max(0, Math.min(selected - (i < selected ? 1 : 0), ranks.length - 2)))
  }

  const moveRank = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= ranks.length) return
    const next = [...ranks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setRanks(next)
    setSelected(j)
  }

  const duplicateRank = i => {
    const source = ranks[i]
    let key = `${source.key}_copy`
    while (ranks.some(r => r.key === key)) key += '_'
    const next = [...ranks]
    next.splice(i + 1, 0, { ...source, key, perms: [...source.perms] })
    setRanks(next)
    setSelected(i + 1)
  }

  const runImport = () => {
    try {
      const parsed = parseConfig(importText)
      setRanks(parsed.ranks)
      setMembers(parsed.members)
      setSettings(parsed.settings)
      setBans(parsed.bans)
      setSelected(0)
      setImporting(false)
      setImportText('')
      setImportError('')
    } catch (e) {
      setImportError(e.message)
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([config], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'config_remoteadmin.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareLink = () => `${window.location.origin}${window.location.pathname}#/ranks?s=${encodeState(state)}`
  const errors = problems.filter(p => p.level === 'error').length

  return (
    <div className="content-wrapper" style={{ minHeight: 0 }}>
      <div className="card header-card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px' }}>
        <h2 style={{ marginBottom: 2, fontSize: '1.2rem' }}>Ranks &amp; Badges</h2>
        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Build your <code>config_remoteadmin.txt</code>: ranks, badges, permissions and staff members.
        </p>
      </div>

      <div className="rk-grid">
        <div className="card rk-ranks-card">
          <h3><i className="fa-solid fa-layer-group"></i> Ranks</h3>
          <div className="rk-ranks">
            {ranks.map((r, i) => (
              <div key={i} className={`rk-rank ${i === selected ? 'active' : ''}`}
                onClick={() => { setSelected(i); setTab('rank') }}>
                <div className="rk-rank-main">
                  <Badge rank={r} />
                  <code>{r.key || '(no ID)'}</code>
                </div>
                <div className="rk-rank-actions" onClick={e => e.stopPropagation()}>
                  <button type="button" title="Move up" disabled={i === 0} onClick={() => moveRank(i, -1)}><i className="fa-solid fa-chevron-up"></i></button>
                  <button type="button" title="Move down" disabled={i === ranks.length - 1} onClick={() => moveRank(i, 1)}><i className="fa-solid fa-chevron-down"></i></button>
                  <button type="button" title="Duplicate" onClick={() => duplicateRank(i)}><i className="fa-solid fa-clone"></i></button>
                  <button type="button" title="Delete" onClick={() => removeRank(i)}><i className="fa-solid fa-trash-can"></i></button>
                </div>
              </div>
            ))}
            {ranks.length === 0 && <p className="text-muted rk-empty">No ranks yet.</p>}
          </div>
          <button type="button" className="btn btn-secondary rk-add" onClick={addRank}>
            <i className="fa-solid fa-plus"></i>Add rank
          </button>
        </div>

        <div className="card rk-editor-card">
          <div className="card-tabs">
            {TABS.map(t => (
              <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                <i className={`fa-solid ${t.icon}`}></i> {t.label}
                {t.id === 'members' && members.length > 0 && <span className="rk-count">{members.length}</span>}
              </button>
            ))}
          </div>
          <div className="rk-editor">
            {tab === 'rank' && (rank
              ? <RankEditor rank={rank} ranks={ranks} update={updateRank} />
              : <p className="text-muted rk-empty">Add a rank to edit it.</p>)}
            {tab === 'members' && <MembersEditor members={members} ranks={ranks} setMembers={setMembers} />}
            {tab === 'settings' && <SettingsEditor settings={settings} ranks={ranks} setSettings={setSettings} />}
            {tab === 'bans' && <BansEditor bans={bans} setBans={setBans} />}
          </div>
        </div>

        <div className="card output-card rk-output-card">
          <h3>
            <i className="fa-solid fa-file-lines"></i> config_remoteadmin.txt
            <button type="button" className="rk-link rk-import-toggle" onClick={() => { setImporting(!importing); setImportError('') }}>
              <i className={`fa-solid ${importing ? 'fa-xmark' : 'fa-file-import'}`}></i> {importing ? 'Cancel import' : 'Import existing'}
            </button>
          </h3>
          {importing ? (
            <>
              <textarea className="rk-config" value={importText} placeholder="Paste your current config_remoteadmin.txt here"
                onChange={e => setImportText(e.target.value)} spellCheck={false} />
              {importError && <div className="rk-problem error"><i className="fa-solid fa-circle-xmark"></i>{importError}</div>}
              <div className="output-buttons">
                <button type="button" className="btn btn-primary" onClick={runImport} disabled={!importText.trim()}>
                  <i className="fa-solid fa-file-import"></i>Load config
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea className="rk-config" readOnly value={config} spellCheck={false} />
              {problems.length > 0 && (
                <div className="rk-problems">
                  {problems.map((p, i) => (
                    <div key={i} className={`rk-problem ${p.level}`}>
                      <i className={`fa-solid ${p.level === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}`}></i>{p.text}
                    </div>
                  ))}
                </div>
              )}
              <div className="output-buttons">
                <CopyButton getValue={() => config} label={errors ? `Copy (${errors} error${errors > 1 ? 's' : ''})` : 'Copy Config'} />
                <button type="button" className="btn btn-secondary" onClick={download}>
                  <i className="fa-solid fa-download"></i>Download
                </button>
                <CopyButton getValue={shareLink} className="btn btn-secondary" label="Copy Link" copiedLabel="Link copied!" icon="fa-link"
                  title="Link that opens this page with your ranks. The override password is never included." />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
