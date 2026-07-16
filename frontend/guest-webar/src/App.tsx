import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RescuePage from './pages/RescuePage.js';
import NotFoundPage from './pages/NotFoundPage.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/rescue/:token" element={<RescuePage />} />
        <Route path="/r/:token" element={<Navigate to="/rescue/:token" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
