import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import RescuePage from './pages/RescuePage.js';
import NotFoundPage from './pages/NotFoundPage.js';
import HomePage from './pages/HomePage.js';
import ScanPage from './pages/ScanPage.js';
import MapPage from './pages/MapPage.js';
import CompletePage from './pages/CompletePage.js';

/**
 * QR membawa URL pendek `/r/<token>` (architecture.md §10.9).
 *
 * Sebelumnya route ini memakai `<Navigate to="/rescue/:token" />`, yang
 * mengarah ke string literal "/rescue/:token" — token tidak pernah
 * disubstitusi, sehingga SETIAP QR yang dipindai mendarat di halaman mati.
 */
function ShortLinkRedirect() {
  const { token } = useParams<{ token: string }>();
  if (!token) return <NotFoundPage />;
  return <Navigate to={`/rescue/${encodeURIComponent(token)}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Inject keyframe for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Routes>
        {/* Drill guest flow (new) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/complete" element={<CompletePage />} />

        {/* Existing AR rescue flow */}
        <Route path="/rescue/:token" element={<RescuePage />} />
        <Route path="/r/:token" element={<ShortLinkRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
