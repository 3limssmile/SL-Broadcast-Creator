import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { path: '/broadcast', label: 'Broadcast Creator', icon: 'fa-tower-broadcast' },
  { path: '/keycard', label: 'Keycard Creator', icon: 'fa-id-card' },
  { path: '/cassie', label: 'CASSIE', icon: 'fa-bullhorn' },
  { path: '/ranks', label: 'Ranks & Badges', icon: 'fa-user-shield' },
]

export default function Topbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsOpen(false)
  }, [location])

  const visibleLinks = NAV_LINKS.slice(0, 4)
  const overflowLinks = NAV_LINKS.slice(4)

  return (
    <header className="topbar">
      <Link to="/" className="topbar-left">
        <i className="fa-solid fa-server"></i>
        <span>SCP:SL Admin Tools</span>
      </Link>

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
        <a href="https://github.com/3limssmile/SL-Admin-Tools" target="_blank" rel="noreferrer">
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

      <div className={`hamburger-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">Menu</div>
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
        <div className="mobile-menu-footer">
          <a href="https://github.com/3limssmile/SL-Admin-Tools" target="_blank" rel="noreferrer">
            <i className="fa-solid fa-code"></i>
            Source code
          </a>
          <a href="https://github.com/3limssmile" target="_blank" rel="noreferrer">
            <i className="fa-brands fa-github"></i>
            GitHub profile
          </a>
        </div>
      </div>
    </header>
  )
}
