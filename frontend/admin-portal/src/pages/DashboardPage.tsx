import React, { useEffect, useState } from 'react';
import type { AnalyticsSummary } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import { adminApi } from '../services/api.js';

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getAnalytics();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingState message="Memuat dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Tingkat Partisipasi" value={`${data?.participationRatePercentage?.toFixed(1) ?? '—'}%`} />
        <StatCard label="Rata-rata Waktu Berlindung" value={data ? `${(data.averageShelterTimeMs / 1000).toFixed(1)}s` : '—'} />
        <StatCard label="Total Lokasi" value={String(data?.heatmapCells?.length ?? '—')} />
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Tren Rute Evakuasi</h2>
        <div style={{ background: 'var(--color-surface-white)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', minHeight: 120 }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            [Placeholder grafik tren — implementasi Domain 4]
          </p>
          {data?.escapeRouteTrends?.map((t) => (
            <div key={t.period} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
              {t.period}: {(t.averageEvacuationTimeMs / 1000).toFixed(1)}s rata-rata evakuasi
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Heatmap Lokasi</h2>
        <div style={{ background: 'var(--color-surface-white)', borderRadius: 8, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: 16 }}>
            [Placeholder spatial matrix — implementasi Domain 4]
          </p>
          {data?.heatmapCells?.map((cell) => (
            <div key={cell.locationRef} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 13 }}>{cell.locationRef}</span>
              <span style={{ fontSize: 13, color: cell.failureRatePercentage > 20 ? 'var(--color-error)' : 'var(--color-success)' }}>
                {cell.failureRatePercentage.toFixed(1)}% gagal
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--color-surface-white)',
      borderRadius: 8,
      padding: 20,
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary-900)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
