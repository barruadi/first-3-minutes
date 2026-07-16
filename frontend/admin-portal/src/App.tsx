import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell.js';
import LoadingState from './components/LoadingState.js';

const DashboardPage = lazy(() => import('./pages/DashboardPage.js'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.js'));
const LocationsPage = lazy(() => import('./pages/LocationsPage.js'));
const LocationDetailPage = lazy(() => import('./pages/LocationDetailPage.js'));
const CompliancePage = lazy(() => import('./pages/CompliancePage.js'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState message="Memuat halaman..." />}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:locationId" element={<LocationDetailPage />} />
            <Route path="compliance" element={<CompliancePage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
