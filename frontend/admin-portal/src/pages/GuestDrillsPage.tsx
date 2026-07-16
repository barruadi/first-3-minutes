import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GuestSession } from '../services/api.js';
import { adminApi } from '../services/api.js';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import EmptyState from '../components/EmptyState.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Stats derived from sessions
// ---------------------------------------------------------------------------

interface Stats {
  total: number;
  completionRate: number;
  avgDurationSeconds: number | null;
}

function deriveStats(sessions: GuestSession[]): Stats {
  if (sessions.length === 0) {
    return { total: 0, completionRate: 0, avgDurationSeconds: null };
  }
  const completed = sessions.filter((s) => s.completed);
  const completionRate = (completed.length / sessions.length) * 100;
  const avgDurationSeconds =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + s.duration_seconds, 0) / completed.length
      : null;
  return { total: sessions.length, completionRate, avgDurationSeconds };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--color-surface-white)',
        borderRadius: 8,
        padding: 20,
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary-900)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatusBadge({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--color-success)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        ✓ Selesai
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--color-warning)',
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      ⚠ Tidak selesai
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AUTO_REFRESH_MS = 30_000;

export default function GuestDrillsPage() {
  const [sessions, setSessions] = useState<GuestSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApi.getGuestSessions(controller.signal);
      if (!controller.signal.aborted) {
        // Sort newest first
        const sorted = [...result].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSessions(sorted);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e : new Error('Gagal memuat data sesi tamu'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    void load();

    timerRef.current = setInterval(() => {
      void load();
    }, AUTO_REFRESH_MS);

    return () => {
      abortRef.current?.abort();
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [load]);

  const stats = sessions ? deriveStats(sessions) : null;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Latihan evakuasi</p>
          <h1>Sesi Tamu</h1>
          <p className="page-subtitle">
            Rekap sesi tamu yang memindai kode QR dan mengikuti rute evakuasi
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => void load()}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Memuat...' : 'Segarkan'}
        </button>
      </header>

      {/* Stats summary */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <StatCard label="Total Sesi" value={String(stats.total)} />
          <StatCard
            label="Tingkat Penyelesaian"
            value={stats.total > 0 ? `${stats.completionRate.toFixed(1)}%` : '—'}
          />
          <StatCard
            label="Rata-rata Durasi (Selesai)"
            value={
              stats.avgDurationSeconds !== null
                ? formatDuration(Math.round(stats.avgDurationSeconds))
                : '—'
            }
          />
        </div>
      )}

      {/* Table section */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Daftar Sesi</h2>
        <div
          style={{
            background: 'var(--color-surface-white)',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          {loading && !sessions ? (
            <LoadingState message="Memuat sesi tamu..." />
          ) : error ? (
            <ErrorState message={error.message} onRetry={() => void load()} />
          ) : sessions && sessions.length === 0 ? (
            <EmptyState
              message="Belum ada sesi tamu"
              hint="Sesi akan muncul setelah tamu memindai kode QR dan menyelesaikan rute evakuasi."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tanggal / Waktu</th>
                    <th style={thStyle}>Lokasi Awal</th>
                    <th style={thStyle}>Durasi</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions!.map((session, idx) => (
                    <tr
                      key={session.id}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(243,228,201,.18)',
                      }}
                    >
                      <td style={tdStyle}>{formatDateTime(session.created_at)}</td>
                      <td style={tdStyle}>{session.anchor_name}</td>
                      <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>
                        {formatDuration(session.duration_seconds)}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge completed={session.completed} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {sessions && sessions.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            {sessions.length} sesi · Diperbarui otomatis setiap 30 detik
          </p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--color-border)',
  background: 'rgba(243,228,201,.3)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};
