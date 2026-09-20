import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import Mark from '../../brand/Mark'
import './Nav.css'

const LINKS = [
  { to: '/monitor', label: 'Monitor', index: '01', id: 'nav-monitor' },
  { to: '/predict', label: 'Predict', index: '02', id: 'nav-predict' },
  { to: '/analytics', label: 'Analytics', index: '03', id: 'nav-analytics' },
]

interface NavProps {
  /** Over the landing hero the bar stays transparent until you scroll. */
  transparent?: boolean
}

export default function Nav({ transparent = false }: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!transparent) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparent])

  const solid = !transparent || scrolled

  return (
    <nav
      className={`nav ${solid ? 'nav--solid' : ''} ${open ? 'nav--open' : ''}`}
      role="navigation"
      aria-label="Main"
    >
      <div className="nav__bar">
        <NavLink to="/" className="nav__brand" id="nav-home">
          <Mark size={26} />
          <span className="nav__wordmark">VayuDrishti</span>
        </NavLink>

        <div className="nav__links">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              id={l.id}
              className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}
            >
              <span className="nav__link-index">{l.index}</span>
              <span className="nav__link-label">{l.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav__aside">
          <span className="pill pill--live">
            <span className="pill__dot" />
            Historical
          </span>
        </div>

        <button
          className="nav__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span className="nav__toggle-bar" />
          <span className="nav__toggle-bar" />
        </button>
      </div>

      <div className="nav__sheet" hidden={!open}>
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `nav__sheet-link ${isActive ? 'nav__sheet-link--active' : ''}`
            }
          >
            <span className="nav__link-index">{l.index}</span>
            {l.label}
          </NavLink>
        ))}
        <span className="nav__sheet-mode label">Historical mode · CNN v1</span>
      </div>
    </nav>
  )
}
