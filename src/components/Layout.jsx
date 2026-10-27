import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useData } from '../state/DataContext.jsx';
import { REPO_URL } from '../config/project.js';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/needs', label: 'Needs Board' },
  { to: '/match', label: 'Match Explorer' },
  { to: '/organizations', label: 'Organizations' },
  { to: '/impact', label: 'Impact' },
  { to: '/how-it-works', label: 'How It Works' },
];

function Toast() {
  const { toast, clearToast } = useData();
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(clearToast, 6000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {toast && (
        <div className={`toast toast-${toast.tone}`} key={toast.id}>
          <span>{toast.message}</span>
          <button type="button" className="toast-close" onClick={clearToast} aria-label="Dismiss notification">×</button>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);
  const { backend, loadError } = useData();

  // Close the mobile menu and move focus to the page content after navigation.
  useEffect(() => {
    setMenuOpen(false);
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="Bridge home">
            <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true">
              <path d="M1 18 C8 3, 22 3, 29 18" stroke="currentColor" strokeWidth="2.5" fill="none" />
              <path d="M1 18h28M8 18v-6.5M15 18V8.5M22 18v-6.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="brand-name">Bridge</span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
          <nav id="primary-nav" aria-label="Primary" className={menuOpen ? 'open' : ''}>
            <ul>
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.end}>{n.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div className="demo-banner" role="note">
        <div className="container">
          <span className="badge badge-demo">Demo</span> Records marked Demo are fictional. This build has no login, so you can switch
          between volunteer and organization views. <Link to="/how-it-works#demo">About the demo</Link>
        </div>
      </div>

      {loadError && (
        <div className="container">
          <div className="alert alert-error" role="alert">Could not load data: {loadError}</div>
        </div>
      )}

      <main id="main" ref={mainRef} tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <p className="footer-name">Bridge</p>
            <p>Connecting community needs with community action.</p>
          </div>
          <ul className="footer-links">
            <li><Link to="/how-it-works">How matching works</Link></li>
            <li><Link to="/moderation">Moderation queue</Link></li>
            <li><a href={REPO_URL}>Source code</a></li>
          </ul>
          <p className="footer-meta">
            Data storage: {backend === 'base44' ? 'Base44 database' : 'this browser (offline demo)'}
          </p>
        </div>
      </footer>
      <Toast />
    </div>
  );
}
