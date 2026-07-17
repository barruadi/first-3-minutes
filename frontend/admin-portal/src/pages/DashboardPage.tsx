import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnalyticsSummary } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import EmptyState from '../components/EmptyState.js';
import { TrendChart, HeatmapMatrix, HeatmapTable, ParticipationChart } from '../components/charts.js';
import { adminApi, AdminApiError, type GuestStats } from '../services/api.js';
import { markDashboardReady, resetDashboardMarks, MARK_NAV_START } from '../services/performance.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [guestStats, setGuestStats] = useState<GuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const statsAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    statsAbortRef.current?.abort();
    const controller = new AbortController();
    const statsController = new AbortController();
    abortRef.current = controller;
    statsAbortRef.current = statsController;

    setLoading(true);
    setError(null);
    resetDashboardMarks();
    performance.mark(MARK_NAV_START);

    const [analyticsResult] = await Promise.allSettled([
      adminApi.getAnalytics(controller.signal).catch(() => null),
      adminApi.getGuestStats(statsController.signal)
        .then((s) => { if (!statsController.signal.aborted) setGuestStats(s); })
        .catch(() => null),
    ]);

    if (controller.signal.aborted) return;

    if (analyticsResult.status === 'fulfilled' && analyticsResult.value) {
      setData(analyticsResult.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  useLayoutEffect(() => {
    if (!loading && !error) markDashboardReady();
  }, [loading, error]);

  if (loading) return <LoadingState message="Memuat dashboard..." />;

  if (error) {
    const message =
      error instanceof AdminApiError && error.code === 'BUILDING_SCOPE_FORBIDDEN'
        ? 'Gedung demo belum dikonfigurasi pada server.'
        : error.message;
    return <ErrorState message={message} onRetry={() => void load()} />;
  }

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Pusat kesiapsiagaan</p>
          <h1>Dashboard</h1>
          {data && <p className="page-subtitle">Gedung demo aktif · {data.buildingId}</p>}
        </div>
        <button className="secondary-button" onClick={() => void load()} disabled={loading}>
          {loading ? 'Memuat...' : 'Segarkan'}
        </button>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          label="Total Sesi Tamu"
          value={guestStats !== null ? String(guestStats.totalSessions) : '—'}
        />
        <StatCard
          label="Tingkat Penyelesaian"
          value={guestStats !== null ? `${guestStats.completionRate.toFixed(1)}%` : '—'}
        />
        <StatCard
          label="Rata-rata Durasi"
          value={
            guestStats?.avgDurationSeconds != null
              ? formatDuration(Math.round(guestStats.avgDurationSeconds))
              : '—'
          }
        />
        <StatCard
          label="Titik QR Aktif"
          value={guestStats !== null ? String(guestStats.anchorStats.length) : '—'}
        />
        <StatCard
          label="Gunakan AR"
          value={
            guestStats !== null
              ? `${guestStats.arUsedCount} (${guestStats.arUsageRate.toFixed(1)}%)`
              : '—'
          }
        />
        <StatCard
          label="Titik Terlambat"
          value={guestStats?.bottleneckAnchor ?? '—'}
        />
      </div>

      {guestStats && guestStats.anchorStats.length > 0 && (
        <Section title="Statistik per Titik QR">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Lokasi', 'Sesi', 'Selesai', 'Penyelesaian', 'Pakai AR', 'Avg Durasi'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...guestStats.anchorStats]
                  .sort((a, b) => b.scanCount - a.scanCount)
                  .map((a, i) => (
                    <tr key={a.anchorId} style={{ background: i % 2 ? 'rgba(243,228,201,.18)' : 'transparent' }}>
                      <td style={tdStyle}>{a.anchorName}</td>
                      <td style={tdStyle}>{a.scanCount}</td>
                      <td style={tdStyle}>{a.completionCount}</td>
                      <td style={tdStyle}>{a.completionRate.toFixed(1)}%</td>
                      <td style={tdStyle}>{a.arUsedCount} ({a.arUsageRate.toFixed(1)}%)</td>
                      <td style={tdStyle}>
                        {a.avgDurationSeconds != null ? formatDuration(Math.round(a.avgDurationSeconds)) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {data && (data.escapeRouteTrends.length > 0 || data.heatmapCells.length > 0) && (
        <>
          <Section title="Tren Rute Evakuasi">
            {data.escapeRouteTrends.length > 0 ? (
              <TrendChart points={data.escapeRouteTrends} />
            ) : (
              <EmptyState message="Belum ada tren evakuasi pada periode ini." />
            )}
          </Section>

          <Section title="Heatmap Kegagalan per Lokasi">
            <HeatmapMatrix
              cells={data.heatmapCells}
              onSelect={(locationRef) => navigate(`/locations?ref=${encodeURIComponent(locationRef)}`)}
            />
            <HeatmapTable cells={data.heatmapCells} />
          </Section>
        </>
      )}

      {!guestStats && !data && (
        <EmptyState message="Belum ada data. Mulai dengan memindai QR di aplikasi tamu." />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</h2>
      <div
        style={{
          background: 'var(--color-surface-white)',
          borderRadius: 8,
          padding: 16,
          border: '1px solid var(--color-border)',
        }}
      >
        {children}
      </div>
    </section>
  );
}

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

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--color-border)',
  background: 'rgba(243,228,201,.3)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  fontVariantNumeric: 'tabular-nums',
};
