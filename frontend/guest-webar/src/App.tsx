import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import RescuePage from './pages/RescuePage.js';
import NotFoundPage from './pages/NotFoundPage.js';

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
      <Routes>
        <Route path="/rescue/:token" element={<RescuePage />} />
        <Route path="/r/:token" element={<ShortLinkRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
