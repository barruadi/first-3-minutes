import React, { useState } from 'react';
import { adminApi } from '../services/api.js';

export default function CompliancePage() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  async function exportPdf() {
    setGenerating(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = await adminApi.exportCompliance({
        buildingId: 'building-demo-001',
        periodFrom: monthAgo,
        periodTo: now,
      });
      setReportId(result.reportId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat laporan');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Laporan Kepatuhan</h1>
      <div style={{ background: 'var(--color-surface-white)', borderRadius: 8, padding: 24, border: '1px solid var(--color-border)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Export PDF Kepatuhan</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Ekspor laporan kepatuhan untuk bangunan demo periode 30 hari terakhir.
        </p>
        <button
          onClick={() => void exportPdf()}
          disabled={generating}
          style={{
            padding: '10px 20px',
            background: 'var(--color-primary-900)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: 14,
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? 'Membuat laporan...' : 'Export PDF'}
        </button>
        {error && <div style={{ color: 'var(--color-error)', marginTop: 8, fontSize: 13 }}>{error}</div>}
        {reportId && (
          <div style={{ marginTop: 12 }}>
            <a
              href={`${import.meta.env['VITE_ADMIN_API_BASE_URL'] ?? 'http://localhost:8000'}/api/admin/compliance-reports/${reportId}/download`}
              download
              style={{ color: 'var(--color-info)', fontWeight: 600, fontSize: 14 }}
            >
              Unduh laporan #{reportId}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
