import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useData } from '../state/DataContext.jsx';

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
            <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="#14b8a6" />
              <path d="M5 22 Q16 6 27 22" stroke="#0b2545" strokeWidth="3" fill="none" />
              <path d="M5 22h22M10 22v-5M16 22v-8M22 22v-5" stroke="#fff" strokeWidth="2" />
            </svg>
            <span className="brand-text">
              <strong>Bridge</strong>
              <small>Community needs ↔ community action</small>
            </span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">{menuOpen ? 'Close' : 'Open'} navigation menu</span>
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
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
          <strong>Demo mode:</strong> records marked <span className="badge badge-demo">Demo</span> are fictional organizations and volunteers.
          Organizations are <strong>unverified</strong> unless marked otherwise. No login is required in this build, so you can switch between
          volunteer and organization views.
          {backend === 'local' && ' Data is saved in this browser.'}
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
          <p>
            <strong>Bridge</strong> — Connecting Community Needs With Community Action.
          </p>
          <p className="muted">
            Compatibility scores describe how well a listing fits a stated profile. They are not predictions of success.
            Hours appear only after an organization verifies completion.
          </p>
          <p>
            <Link to="/moderation">Moderation queue</Link> · <Link to="/how-it-works#demo">Demo data controls</Link> ·{' '}
            <span className="muted">Storage: {backend === 'base44' ? 'Base44 database' : 'browser (offline demo)'}</span>
          </p>
        </div>
      </footer>
      <Toast />
    </div>
  );
}
