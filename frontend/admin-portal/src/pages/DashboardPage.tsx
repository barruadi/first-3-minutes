import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnalyticsSummary } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import EmptyState from '../components/EmptyState.js';
import { TrendChart, HeatmapMatrix, HeatmapTable, ParticipationChart } from '../components/charts.js';
import { adminApi, AdminApiError } from '../services/api.js';
import { markDashboardReady, resetDashboardMarks, MARK_NAV_START } from '../services/performance.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    resetDashboardMarks();
    performance.mark(MARK_NAV_START);

    try {
      const result = await adminApi.getAnalytics(controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e : new Error('Gagal memuat data'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  /**
   * dashboard_ready ditandai setelah SELURUH widget wajib ter-commit ke DOM,
   * bukan saat fetch selesai. useLayoutEffect berjalan setelah commit dan
   * sebelum paint berikutnya.
   */
  useLayoutEffect(() => {
    if (!loading && data && !error) markDashboardReady();
  }, [loading, data, error]);

  if (loading) return <LoadingState message="Memuat dashboard..." />;

  if (error) {
    const message =
      error instanceof AdminApiError && error.code === 'BUILDING_SCOPE_FORBIDDEN'
        ? 'Gedung demo belum dikonfigurasi pada server.'
        : error.message;
    return <ErrorState message={message} onRetry={() => void load()} />;
  }

  if (!data) return <EmptyState message="Belum ada data analitik." />;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Pusat kesiapsiagaan</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Gedung demo aktif · {data.buildingId}</p>
        </div>
        <button className="secondary-button" onClick={() => navigate('/compliance')}>
          Export kepatuhan
        </button>
      </header>

      {/* Angka headline: stat tile, bukan chart. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard label="Tingkat Partisipasi" value={`${data.participationRatePercentage.toFixed(1)}%`} />
        <StatCard label="Rata-rata Waktu Berlindung" value={`${(data.averageShelterTimeMs / 1000).toFixed(1)}s`} />
        <StatCard label="Lokasi Terpantau" value={String(data.heatmapCells.length)} />
      </div>

      <Section title="Partisipasi Latihan">
        <div className="participation-layout">
          <ParticipationChart percentage={data.participationRatePercentage} />
          <div>
            <strong className="metric-callout">{data.participationRatePercentage.toFixed(1)} dari 100%</strong>
            <p className="page-subtitle">Angka agregat berasal langsung dari layanan analitik gedung demo.</p>
          </div>
        </div>
      </Section>

      <Section title="Tren Rute Evakuasi">
        {data.escapeRouteTrends.length > 0 ? (
          <TrendChart points={data.escapeRouteTrends} />
        ) : (
          <EmptyState message="Belum ada tren evakuasi pada periode ini." />
        )}
      </Section>

      <Section title="Heatmap Kegagalan per Lokasi">
        {data.heatmapCells.length > 0 ? (
          <>
            <HeatmapMatrix
              cells={data.heatmapCells}
              onSelect={(locationRef) => navigate(`/locations?ref=${encodeURIComponent(locationRef)}`)}
            />
            <HeatmapTable cells={data.heatmapCells} />
          </>
        ) : (
          <EmptyState message="Belum ada data kegagalan per lokasi." />
        )}
      </Section>
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
