import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import RescuePage from './pages/RescuePage.js';
import NotFoundPage from './pages/NotFoundPage.js';
import HomePage from './pages/HomePage.js';
import ScanPage from './pages/ScanPage.js';
import MapPage from './pages/MapPage.js';
import CompletePage from './pages/CompletePage.js';

function ShortLinkRedirect() {
  const { token } = useParams<{ token: string }>();
  if (!token) return <NotFoundPage />;
  return <Navigate to={`/rescue/${encodeURIComponent(token)}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/rescue/:token" element={<RescuePage />} />
        <Route path="/r/:token" element={<ShortLinkRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
