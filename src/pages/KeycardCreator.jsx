import { useState, lazy, Suspense } from 'react'
import CopyButton from '../components/CopyButton.jsx'

const KeycardPreview3D = lazy(() => import('../components/KeycardPreview3D.jsx'))

// Fields required per card type
const REQS = {
  KeycardCustomTaskForce:  ['holderName', 'serial', 'rankDetail'],
  KeycardCustomSite02:     ['label', 'labelColor', 'holderName', 'wearLevel'],
  KeycardCustomManagement: ['label', 'labelColor'],
  KeycardCustomMetalCase:  ['label', 'labelColor', 'holderName', 'serial'],
}

const ALL_OPTIONAL = ['label', 'labelColor', 'holderName', 'serial', 'rankDetail', 'wearLevel']

function procString(str, fallback) {
  if (!str) return fallback
  const replaced = str.replace(/ /g, '_')
  return replaced || fallback
}

function buildCommand(fields) {
  const {
    playerId, cardType, invName, contLevel, armoryLevel, adminLevel, permColor, tintColor,
    label, labelColor, holderName, serial, rankDetail, wearLevel,
  } = fields

  const pid = playerId || '1'
  const name = procString(invName, 'Custom_Keycard')
  const cont = contLevel || '0'
  const arm = armoryLevel || '0'
  const adm = adminLevel || '0'
  const perm = permColor || 'default'
  const tint = tintColor || 'white'

  let args = [pid, cardType, name, cont, arm, adm, perm, tint]

  if (cardType === 'KeycardCustomTaskForce') {
    args.push(procString(holderName, 'Holder_Name'), serial || '123123123123', rankDetail || '0')
  } else if (cardType === 'KeycardCustomSite02') {
    args.push(procString(label, 'My_Label'), labelColor || 'white', procString(holderName, 'Holder_Name'), wearLevel || '0')
  } else if (cardType === 'KeycardCustomManagement') {
    args.push(procString(label, 'My_Label'), labelColor || 'white')
  } else if (cardType === 'KeycardCustomMetalCase') {
    args.push(procString(label, 'My_Label'), labelColor || 'white', procString(holderName, 'Holder_Name'), serial || '123123123123')
  }

  return 'ckeycard ' + args.join(' ')
}

export default function KeycardCreator() {
  const [fields, setFields] = useState({
    playerId: '',
    cardType: 'KeycardCustomTaskForce',
    invName: 'Custom_Keycard',
    contLevel: '0',
    armoryLevel: '0',
    adminLevel: '0',
    permColor: 'default',
    tintColor: 'white',
    label: 'My_Label',
    labelColor: 'white',
    holderName: 'Holder_Name',
    serial: '123123123123',
    rankDetail: '0',
    wearLevel: '0',
  })

  const set = (key) => (e) => setFields(prev => ({ ...prev, [key]: e.target.value }))

  const visibleFields = REQS[fields.cardType] || []
  const command = buildCommand(fields)

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="card header-card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px' }}>
        <h2 style={{ marginBottom: 2, fontSize: '1.2rem' }}>SCP:SL Custom Keycards</h2>
        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Create unique keycards for special roles or roleplay scenarios using Remote Admin.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10, minHeight: 0 }}>
        {/* Main grid */}
        <div className="grid-container kc-grid" style={{ flex: 1, minHeight: 0 }}>
          {/* Left Column - Base Settings */}
          <div className="grid-column">
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
              <h3><i className="fa-solid fa-gear"></i> Base Settings</h3>

              <div className="form-scroll-area">
                <div className="form-row" style={{ flexShrink: 0, marginBottom: 10 }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label htmlFor="kc-playerid">Player ID / Name:</label>
                    <input id="kc-playerid" type="text" value={fields.playerId} placeholder="1" onChange={set('playerId')} style={{ padding: '8px 12px' }} />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label htmlFor="kc-cardtype">Keycard Type:</label>
                    <select id="kc-cardtype" value={fields.cardType} onChange={set('cardType')} style={{ padding: '8px 12px' }}>
                      <option value="KeycardCustomTaskForce">Custom Task Force</option>
                      <option value="KeycardCustomSite02">Custom Site-02</option>
                      <option value="KeycardCustomManagement">Custom Management</option>
                      <option value="KeycardCustomMetalCase">Custom Metal Case</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="kc-invname">Inventory Name:</label>
                  <input id="kc-invname" type="text" value={fields.invName} onChange={set('invName')} />
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="kc-cont">Containment Lvl:</label>
                    <input id="kc-cont" type="number" value={fields.contLevel} min={0} max={3} onChange={set('contLevel')} style={{ padding: '8px 12px' }} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="kc-arm">Armory Lvl:</label>
                    <input id="kc-arm" type="number" value={fields.armoryLevel} min={0} max={3} onChange={set('armoryLevel')} style={{ padding: '8px 12px' }} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="kc-adm">Admin Lvl:</label>
                    <input id="kc-adm" type="number" value={fields.adminLevel} min={0} max={3} onChange={set('adminLevel')} style={{ padding: '8px 12px' }} />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="kc-permcolor">Permission Color:</label>
                    <input id="kc-permcolor" type="text" value={fields.permColor} placeholder="HEX or Name" onChange={set('permColor')} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="kc-tint">Primary Tint Color:</label>
                    <input id="kc-tint" type="text" value={fields.tintColor} placeholder="HEX or Name" onChange={set('tintColor')} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Specific Settings */}
          <div className="grid-column">
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
              <h3><i className="fa-solid fa-sliders"></i> Specific Settings</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 8, flexShrink: 0 }}>
                These fields adapt based on selected Keycard Type.
              </p>

              <div className="form-scroll-area">
                {visibleFields.includes('label') && (
                  <div className="form-group">
                    <label htmlFor="kc-label">Label:</label>
                    <input id="kc-label" type="text" value={fields.label} onChange={set('label')} />
                  </div>
                )}
                {visibleFields.includes('labelColor') && (
                  <div className="form-group">
                    <label htmlFor="kc-labelcolor">Label Text Color:</label>
                    <input id="kc-labelcolor" type="text" value={fields.labelColor} placeholder="HEX or Name" onChange={set('labelColor')} />
                  </div>
                )}
                {visibleFields.includes('holderName') && (
                  <div className="form-group">
                    <label htmlFor="kc-holder">Card Holder Name:</label>
                    <input id="kc-holder" type="text" value={fields.holderName} onChange={set('holderName')} />
                  </div>
                )}
                {visibleFields.includes('serial') && (
                  <div className="form-group">
                    <label htmlFor="kc-serial">Serial Number:</label>
                    <input id="kc-serial" type="text" value={fields.serial} onChange={set('serial')} />
                  </div>
                )}
                {visibleFields.includes('rankDetail') && (
                  <div className="form-group">
                    <label htmlFor="kc-rank">Rank Detail Option:</label>
                    <select id="kc-rank" value={fields.rankDetail} onChange={set('rankDetail')}>
                      <option value="0">No rings</option>
                      <option value="3">1 ring</option>
                      <option value="2">2 rings</option>
                      <option value="1">3 rings</option>
                    </select>
                  </div>
                )}
                {visibleFields.includes('wearLevel') && (
                  <div className="form-group">
                    <label htmlFor="kc-wear">Wear Level (Index):</label>
                    <input id="kc-wear" type="number" value={fields.wearLevel} min={0} onChange={set('wearLevel')} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid-column">
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
              <h3><i className="fa-solid fa-id-card"></i> Preview</h3>
              <Suspense fallback={<div className="kc-preview"><div className="kc-preview-note">Loading preview…</div></div>}>
                <KeycardPreview3D fields={fields} />
              </Suspense>
              <p className="text-muted kc-credit">
                Drag to rotate. Card art from{' '}
                <a href="https://scpslgame.com/" target="_blank" rel="noreferrer">SCP: Secret Laboratory</a>{' '}
                by Northwood Studios,{' '}
                <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Output Command */}
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
    </div>
  )
}
