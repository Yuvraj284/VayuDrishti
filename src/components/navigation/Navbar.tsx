import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <NavLink to="/" className="navbar__wordmark" id="nav-home">
        VayuDrishti
      </NavLink>

      <div className="navbar__links">
        <NavLink
          to="/monitor"
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          id="nav-monitor"
        >
          Monitor
        </NavLink>
        <NavLink
          to="/predict"
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          id="nav-predict"
        >
          Predict
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
          id="nav-analytics"
        >
          Analytics
        </NavLink>
      </div>

      <span className="navbar__mode">Historical</span>
    </nav>
  )
}
