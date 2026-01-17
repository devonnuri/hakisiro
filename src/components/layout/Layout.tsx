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
        width: '100%',
        margin: '0 auto'
      }}
    >
      <header
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--panel-bg)',
          alignItems: 'center',
          padding: '0 8px'
        }}
      >
        <div style={{ fontWeight: 'bold', marginRight: 16 }}>HAKISIRO</div>
        <NavLink to="/today" className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
          [ TODAY ]
        </NavLink>
        <NavLink to="/pool" className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
          [ POOL ]
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => clsx('nav-link', isActive && 'active')}
        >
          [ ANALYTICS ]
        </NavLink>
        <div style={{ flex: 1 }} />
        <Button onClick={() => setShowSettings(true)} style={{ border: 'none' }}>
          SETTINGS
        </Button>
      </header>

      <main
        style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--spacing-md)',
          minHeight: 0
        }}
      >
        <Outlet />
      </main>

      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}

      <style>{`
        .nav-link {
          padding: 8px 12px;
          text-decoration: none;
          color: var(--text-secondary);
          font-weight: bold;
          font-family: var(--font-main);
          transition: all 0s;
        }
        .nav-link.active {
          color: var(--bg-color) !important;
          background: var(--text-primary);
        }
        .nav-link:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
