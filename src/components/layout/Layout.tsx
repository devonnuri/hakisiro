import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
// import style from './Layout.module.css'; // Unused
import { Button } from '../ui/Button';
import { SettingsOverlay } from '../common/SettingsOverlay';

// Styles for Layout
// We can use a module or just inline styles or global utility classes.
// For layout structure, module/inline is fine.

export const Layout: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      className="layout-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: '800px',
        margin: '0 auto',
        borderLeft: '1px solid var(--border-color)',
        borderRight: '1px solid var(--border-color)'
      }}
    >
      <nav
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-color)',
          alignItems: 'center'
        }}
      >
        <NavLink
          to="/today"
          className={({ isActive }) => clsx('nav-link', isActive && 'active')}
          style={{
            padding: '8px 16px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontWeight: 'bold'
          }}
        >
          today
        </NavLink>
        <NavLink
          to="/pool"
          className={({ isActive }) => clsx('nav-link', isActive && 'active')}
          style={{
            padding: '8px 16px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontWeight: 'bold'
          }}
        >
          pool
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => clsx('nav-link', isActive && 'active')}
          style={{
            padding: '8px 16px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontWeight: 'bold'
          }}
        >
          analytics
        </NavLink>
        <div style={{ flex: 1 }} />
        <Button onClick={() => setShowSettings(true)} style={{ margin: '0 8px', border: 'none' }}>
          settings
        </Button>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}

      {/* Global CSS for active nav link */}
      <style>{`
        .nav-link.active {
          color: var(--accent-color) !important;
          background: var(--highlight-color);
        }
        .nav-link:hover {
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
};
