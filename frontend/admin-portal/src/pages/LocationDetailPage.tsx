import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { QrProvisionResponse } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import { adminApi } from '../services/api.js';

export default function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const [qr, setQr] = useState<QrProvisionResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateQr() {
    if (!locationId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await adminApi.generateQr(locationId);
      setQr(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat QR');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Detail Lokasi</h1>
      <div style={{ marginBottom: 16, color: 'var(--color-text-secondary)', fontSize: 14 }}>
        ID: {locationId}
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Generate QR Rescue</h2>
        <button
          onClick={() => void generateQr()}
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
          {generating ? 'Membuat QR...' : 'Generate Rescue QR'}
        </button>
        {error && <div style={{ color: 'var(--color-error)', marginTop: 8, fontSize: 13 }}>{error}</div>}
        {qr && (
          <div style={{ marginTop: 16, background: 'var(--color-surface-white)', padding: 16, borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>URL Guest:</strong> <a href={qr.guestUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-info)' }}>{qr.guestUrl}</a>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href={qr.qrSvgUrl} download style={{ color: 'var(--color-primary-900)', fontSize: 13, fontWeight: 600 }}>Unduh SVG</a>
              <a href={qr.qrPngUrl} download style={{ color: 'var(--color-primary-900)', fontSize: 13, fontWeight: 600 }}>Unduh PNG</a>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Informasi Lokasi</h2>
        <div style={{ background: 'var(--color-surface-white)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            [Placeholder detail lokasi — implementasi Domain 4]
          </p>
        </div>
      </section>
    </div>
  );
}
