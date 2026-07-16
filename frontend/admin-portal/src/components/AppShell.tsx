import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analytics', label: 'Analitik' },
  { to: '/locations', label: 'Lokasi' },
  { to: '/compliance', label: 'Kepatuhan' },
];

export default function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{
        width: 220,
        background: 'var(--color-primary-900)',
        color: 'var(--color-text-on-primary)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 24px 32px', fontWeight: 700, fontSize: 18 }}>
          3MINUTES
          <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 400, marginTop: 2 }}>Admin Portal</div>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 24px',
              color: isActive ? 'var(--color-surface-warm)' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(243,228,201,0.12)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--color-surface-warm)' : '3px solid transparent',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
