import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Location, QrProvisionResponse } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import { adminApi, AdminApiError } from '../services/api.js';

const API_BASE = import.meta.env['VITE_ADMIN_API_BASE_URL'] ?? 'http://localhost:8000';

/** URL QR bersifat relatif terhadap API; jadikan absolut untuk unduhan. */
function absolute(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

type QrState =
  | { status: 'idle' }
  | { status: 'generating' }
  | { status: 'done'; qr: QrProvisionResponse }
  | { status: 'error'; message: string };

export default function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qr, setQr] = useState<QrState>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setLoadError(null);
    try {
      // Tidak ada endpoint detail lokasi pada contract v1; ambil dari list.
      const all = await adminApi.getLocations(controller.signal);
      if (controller.signal.aborted) return;
      setLocation(all.find((l) => l.id === locationId) ?? null);
    } catch (e) {
      if (controller.signal.aborted) return;
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat lokasi');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const generateQr = useCallback(async () => {
    if (!locationId) return;
    setQr({ status: 'generating' });
    try {
      const result = await adminApi.generateQr(locationId);
      setQr({ status: 'done', qr: result });
    } catch (e) {
      const message =
        e instanceof AdminApiError && e.code === 'LOCATION_NOT_FOUND'
          ? 'Lokasi tidak ditemukan di server.'
          : e instanceof Error
            ? e.message
            : 'Gagal membuat QR';
      setQr({ status: 'error', message });
    }
  }, [locationId]);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  if (loading) return <LoadingState message="Memuat lokasi..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => void load()} />;

  if (!location) {
    return (
      <ErrorState message={`Lokasi "${locationId}" tidak ditemukan.`} onRetry={() => void load()} />
    );
  }

  // Guardrail D4-QR-GENERATE: tombol hanya aktif bila lokasi valid.
  const canGenerate = qr.status !== 'generating';

  return (
    <div>
      <Link to="/locations" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        ← Kembali ke daftar lokasi
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '12px 0 4px' }}>{location.label}</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        {location.locationRef}
      </p>

      <section style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>QR Rescue</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          QR ini ditujukan untuk tamu dan traveler yang berada di lokasi ini. Pekerja tidak
          diwajibkan memindainya.
        </p>

        <button onClick={() => void generateQr()} disabled={!canGenerate} style={button(!canGenerate)}>
          {qr.status === 'generating' ? 'Membuat QR...' : 'Generate Rescue QR'}
        </button>

        <div aria-live="polite" style={{ marginTop: 12, minHeight: 20 }}>
          {qr.status === 'error' && (
            <span style={{ color: 'var(--color-error)', fontSize: 13 }}>{qr.message}</span>
          )}
        </div>

        {qr.status === 'done' && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <img
                src={absolute(qr.qr.qrPngUrl)}
                alt={`Kode QR rescue untuk ${location.label}`}
                width={160}
                height={160}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: '#fff',
                  padding: 8,
                }}
              />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  URL Guest
                </div>
                <code
                  style={{
                    display: 'block',
                    fontSize: 12,
                    wordBreak: 'break-all',
                    background: 'var(--color-surface-muted)',
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 10,
                  }}
                >
                  {qr.qr.guestUrl}
                </code>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={() => void copyUrl(qr.qr.guestUrl)} style={linkButton}>
                    {copied ? 'Tersalin' : 'Salin URL'}
                  </button>
                  <a href={absolute(qr.qr.qrSvgUrl)} download style={linkStyle}>
                    Unduh SVG
                  </a>
                  <a href={absolute(qr.qr.qrPngUrl)} download style={linkStyle}>
                    Unduh PNG
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Data Rute</h2>
        <dl style={{ fontSize: 13, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px' }}>
          <dt style={dt}>Origin</dt>
          <dd>{fmt(location.origin)}</dd>
          <dt style={dt}>Titik rute</dt>
          <dd>{location.routePoints.length} titik</dd>
          <dt style={dt}>Exit</dt>
          <dd>{fmt(location.exitPoint)}</dd>
        </dl>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 12 }}>
          Koordinat rute dihitung backend. Portal tidak membuat atau mengubah rute.
        </p>
      </section>
    </div>
  );
}

function fmt(c: { x: number; y: number; z: number }): string {
  return `(${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)}) m`;
}

const card: React.CSSProperties = {
  background: 'var(--color-surface-white)',
  borderRadius: 8,
  padding: 20,
  border: '1px solid var(--color-border)',
  marginBottom: 24,
};

const dt: React.CSSProperties = { color: 'var(--color-text-secondary)' };

const linkStyle: React.CSSProperties = {
  color: 'var(--color-primary-900)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'underline',
  alignSelf: 'center',
};

const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--color-primary-900)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'underline',
  cursor: 'pointer',
  font: 'inherit',
};

function button(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: 'var(--color-primary-900)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    opacity: disabled ? 0.6 : 1,
    minHeight: 40,
  };
}
