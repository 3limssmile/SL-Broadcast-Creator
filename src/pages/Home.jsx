import { Link } from 'react-router-dom'
import { buildRichText, RichTextRuns } from '../components/RichTextEditor.jsx'
import { BadgePreview } from './RankCreator.jsx'
import keycard from '../assets/home-keycard.webp'

const broadcast = buildRichText('Welcome to the server!', 'gradient', ['#33E0FF', '#FF4FD8'])
const rank = { key: 'owner', badge: 'SERVER OWNER', color: 'red', cover: true, hidden: false }

const TOOLS = [
  {
    path: '/broadcast',
    icon: 'fa-tower-broadcast',
    title: 'Broadcast Creator',
    text: 'Gradient and rich-text broadcasts with a live preview.',
    command: `bc 10 ${broadcast.text}`,
    preview: (
      <div className="preview-box home-preview">
        <div className="home-broadcast"><RichTextRuns runs={broadcast.preview} /></div>
      </div>
    ),
  },
  {
    path: '/keycard',
    icon: 'fa-id-card',
    title: 'Keycard Creator',
    text: 'Custom keycards with a 3D preview of the card.',
    command: 'ckeycard 1 KeycardCustomTaskForce Custom_Keycard 3 2 2 default #1f3fbf Jan_Kowalski 9876543210-1 1',
    preview: (
      <div className="preview-box home-preview home-keycard">
        <img src={keycard} alt="Custom Task Force keycard" />
      </div>
    ),
  },
  {
    path: '/cassie',
    icon: 'fa-bullhorn',
    title: 'CASSIE Announcements',
    text: 'Announcements with custom subtitles, the real voice lines and WAV export.',
    command: 'cassie ATTENTION ALL PERSONNEL . MTFUNIT EPSILON 11 DESIGNATED NINETAILEDFOX HASENTERED',
    preview: (
      <div className="preview-box home-preview">
        <div className="cassie-subtitle home-cassie">
          <span className="cassie-subtitle-prefix">C.A.S.S.I.E :</span> ATTENTION ALL PERSONNEL MTFUNIT EPSILON 11 DESIGNATED NINETAILEDFOX HASENTERED
        </div>
      </div>
    ),
  },
  {
    path: '/ranks',
    icon: 'fa-user-shield',
    title: 'Ranks & Badges',
    text: 'Ranks, badge colors, permissions and staff for config_remoteadmin.txt.',
    command: 'owner_badge: SERVER OWNER',
    preview: <div className="home-ranks"><BadgePreview rank={rank} /></div>,
  },
]

export default function Home() {
  return (
    <div className="content-wrapper">
      <div className="card header-card" style={{ flexShrink: 0, marginBottom: 0, padding: '10px' }}>
        <h2 style={{ marginBottom: 2, fontSize: '1.2rem' }}>SCP:SL Admin Tools</h2>
        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Free tools for SCP: Secret Laboratory server admins. Pick one to start.
        </p>
      </div>

      <div className="grid-container home-grid">
        {TOOLS.map(t => (
          <Link key={t.path} to={t.path} className="card home-tile">
            <h3>
              <i className={`fa-solid ${t.icon}`}></i> {t.title}
              <span className="home-open">Open <i className="fa-solid fa-arrow-right"></i></span>
            </h3>
            {t.preview}
            <p className="home-text">{t.text}</p>
            <div className="home-command">{t.command}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
