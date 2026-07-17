import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analytics', label: 'Analitik' },
  { to: '/locations', label: 'Lokasi' },
  { to: '/compliance', label: 'Kepatuhan' },
  { to: '/guest-drills', label: 'Sesi Tamu' },
];

export default function AppShell() {
  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label="Navigasi utama">
        <div className="app-brand">
          Evacuo
          <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 400, marginTop: 2 }}>Admin Portal</div>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <div className="app-content"><Outlet /></div>
      </main>
    </div>
  );
}
