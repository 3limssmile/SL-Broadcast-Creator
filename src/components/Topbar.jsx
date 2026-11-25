import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { path: '/broadcast', label: 'Broadcast Creator', icon: 'fa-tower-broadcast' },
  { path: '/keycard', label: 'Keycard Creator', icon: 'fa-id-card' },
  { path: '/cassie', label: 'CASSIE', icon: 'fa-bullhorn' },
  // Future tools can be added here
]

export default function Topbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location])

  // Split links: max 3 visible in topbar
  const visibleLinks = NAV_LINKS.slice(0, 3)
  const overflowLinks = NAV_LINKS.slice(3)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <i className="fa-solid fa-server"></i>
        <span>SCP:SL Admin Tools</span>
      </div>

      <nav className="topbar-nav">
        {visibleLinks.map(link => (
          <NavLink 
            key={link.path}
            to={link.path}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <i className={`fa-solid ${link.icon}`}></i>
            {link.label}
          </NavLink>
        ))}
        
        {overflowLinks.length > 0 && (
          <button className="more-btn" onClick={() => setIsOpen(!isOpen)}>
            <i className="fa-solid fa-ellipsis"></i>
            More
          </button>
        )}
      </nav>

      <div className="topbar-right">
        <a href="https://github.com/3limssmile/SL-Broadcast-Creator" target="_blank" rel="noreferrer">
          <i className="fa-brands fa-github"></i>
          GitHub
        </a>
      </div>

      <button 
        className="mobile-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
      </button>

      {/* Mobile / Overflow Menu */}
      <div className={`hamburger-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header" style={{ marginBottom: '20px', color: 'var(--accent-blue)', fontWeight: '700' }}>
          Menu
        </div>
        {NAV_LINKS.map(link => (
          <NavLink 
            key={link.path}
            to={link.path}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <i className={`fa-solid ${link.icon}`}></i>
            {link.label}
          </NavLink>
        ))}
        <a href="https://github.com/3limssmile/SL-Broadcast-Creator" target="_blank" rel="noreferrer" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}>
          <i className="fa-brands fa-github"></i>
          GitHub Profile
        </a>
      </div>
    </header>
  )
}
