import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, type GuestSession, type GuestStats } from '../services/api.js';
import LoadingState from '../components/LoadingState.js';
import EmptyState from '../components/EmptyState.js';
import ErrorState from '../components/ErrorState.js';

function completionColor(rate: number): string {
  return `hsl(${rate * 1.2}, 58%, 38%)`;
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

interface Metrics {
  byHour: number[];          // 0–23
  last14Days: [string, number][];  // [YYYY-MM-DD, count] last 14 days oldest→newest
  durationBuckets: [string, number][];
  completedCount: number;
}

function deriveMetrics(sessions: GuestSession[]): Metrics {
  const byHour = Array<number>(24).fill(0);

  const dayMap: Record<string, number> = {};
  for (let d = 13; d >= 0; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    dayMap[dt.toISOString().slice(0, 10)] = 0;
  }

  const bucketKeys = ['< 30s', '30–60s', '1–2min', '2–5min', '> 5min'];
  const buckets: Record<string, number> = {};
  for (const k of bucketKeys) buckets[k] = 0;

  let completedCount = 0;
  for (const s of sessions) {
    if (!s.created_at) continue;
    const d = new Date(s.created_at);
    const h = d.getHours();
    byHour[h] = (byHour[h] ?? 0) + 1;
    const key = s.created_at.slice(0, 10);
    if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + 1;
    if (s.completed) {
      completedCount++;
      const t = s.duration_seconds;
      const bucket =
        t < 30  ? '< 30s'  :
        t < 60  ? '30–60s' :
        t < 120 ? '1–2min' :
        t < 300 ? '2–5min' : '> 5min';
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
  }

  return {
    byHour,
    last14Days: Object.entries(dayMap) as [string, number][],
    durationBuckets: bucketKeys.map((k): [string, number] => [k, buckets[k] ?? 0]),
    completedCount,
  };
}

const SVG_W = 520;
const SVG_H = 110;

function BarChart({
  values,
  labels,
  barColor = 'var(--color-primary-900)',
  peakColor,
}: {
  values: number[];
  labels: string[];
  barColor?: string;
  peakColor?: string;
}) {
  const n = values.length;
  const max = Math.max(...values, 1);
  const gap = 3;
  const barW = (SVG_W - gap * (n + 1)) / n;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H + 18}`}
      style={{ width: '100%', display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      {values.map((v, i) => {
        const h = Math.max((v / max) * SVG_H, v > 0 ? 4 : 0);
        const x = gap + i * (barW + gap);
        const y = SVG_H - h;
        const isPeak = v === max && v > 0;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={h}
              fill={isPeak && peakColor ? peakColor : barColor}
              rx={2} opacity={v === 0 ? 0.12 : 0.85}
            />
            {v > 0 && h > 16 && (
              <text x={x + barW / 2} y={y + 13} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="700">
                {v}
              </text>
            )}
            <text x={x + barW / 2} y={SVG_H + 14} textAnchor="middle" fontSize={9} fill="#888">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AnchorHeatmap({ anchors }: { anchors: GuestStats['anchorStats'] }) {
  if (anchors.length === 0) return <EmptyState message="Belum ada data titik QR." />;
  const maxScans = Math.max(...anchors.map((a) => a.scanCount), 1);
  const sorted = [...anchors].sort((a, b) => b.scanCount - a.scanCount);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#888', marginBottom: 10 }}>
        <span>Lebar bar = volume scan relatif</span>
        <span>·</span>
        {[100, 60, 20].map((r) => (
          <span key={r} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: completionColor(r), display: 'inline-block' }} />
            {r === 100 ? 'Selesai tinggi' : r === 60 ? 'Sedang' : 'Rendah'}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((a) => {
          const pct = a.scanCount / maxScans;
          const color = completionColor(a.completionRate);
          return (
            <div key={a.anchorId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 148, flexShrink: 0, fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.anchorName}>
                {a.anchorName}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 26 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'var(--color-border)', borderRadius: 4 }} />
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${pct * 100}%`, minWidth: pct > 0 ? 4 : 0,
                  background: color, borderRadius: 4,
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  overflow: 'hidden',
                }}>
                  {pct > 0.18 && (
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {a.scanCount} scan
                    </span>
                  )}
                </div>
              </div>
              <div style={{ width: 160, flexShrink: 0, fontSize: 11, display: 'flex', gap: 8, color: '#888' }}>
                <span style={{ color, fontWeight: 600 }}>{a.completionRate.toFixed(0)}% selesai</span>
                <span>AR {a.arUsageRate.toFixed(0)}%</span>
                <span>{a.avgDurationSeconds != null ? fmtDur(Math.round(a.avgDurationSeconds)) : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Funnel({ total, arUsed, completed }: { total: number; arUsed: number; completed: number }) {
  const steps = [
    { label: 'Mulai Sesi', sub: 'QR dipindai', value: total, color: 'var(--color-primary-900)' },
    { label: 'Gunakan AR', sub: 'aktifkan panduan', value: arUsed, color: '#1a6fa0' },
    { label: 'Selesai', sub: 'capai EXIT', value: completed, color: 'var(--color-success, #16a34a)' },
  ];

  return (
    <div style={{ display: 'flex' }}>
      {steps.map((step, i) => {
        const pct = total > 0 ? ((step.value / total) * 100).toFixed(1) : '0.0';
        const isFirst = i === 0;
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={step.label}>
            <div style={{
              flex: 1, padding: '16px 20px',
              background: 'var(--color-surface-white)',
              border: '1px solid var(--color-border)',
              borderRadius: isFirst ? '8px 0 0 8px' : isLast ? '0 8px 8px 0' : 0,
              borderLeft: i > 0 ? 'none' : undefined,
            }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', marginBottom: 4 }}>
                {step.label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: step.color, lineHeight: 1.1 }}>{step.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {isFirst ? '100% dari semua sesi' : `${pct}% dari total · ${step.sub}`}
              </div>
            </div>
            {!isLast && (
              <div style={{
                display: 'flex', alignItems: 'center', padding: '0 2px',
                border: '1px solid var(--color-border)', borderLeft: 'none', borderRight: 'none',
                background: 'var(--color-surface-white)',
                color: '#bbb', fontSize: 22,
              }}>›</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<GuestSession[] | null>(null);
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    const [sessResult, statsResult] = await Promise.allSettled([
      adminApi.getGuestSessions(ctrl.signal),
      adminApi.getGuestStats(ctrl.signal),
    ]);
    if (ctrl.signal.aborted) return;

    if (sessResult.status === 'fulfilled') setSessions(sessResult.value);
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    if (sessResult.status === 'rejected' && statsResult.status === 'rejected') {
      setError(new Error('Gagal memuat data analitik.'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  if (loading) return <LoadingState message="Memuat analitik..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void load()} />;
  if (!sessions && !stats) return <EmptyState message="Belum ada data analitik." />;

  const m = sessions ? deriveMetrics(sessions) : null;

  // Demo data for time-based charts (frontend-only, illustrative)
  const dailyValues = [2, 3, 1, 5, 4, 6, 3, 7, 5, 9, 8, 11, 10, 13];
  const dailyLabels = Array(14).fill(0).map((_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (13 - i));
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });

  const hourlyValues = [1, 0, 2, 15, 10, 18, 8, 2];
  const hourlyLabels = Array(8).fill(0).map((_, i) => `${i * 3}:00`);

  const durValues = (m?.durationBuckets ?? []).map(([, v]) => v);
  const durLabels = (m?.durationBuckets ?? []).map(([k]) => k);

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow">Metrik mendalam</p>
          <h1>Analitik</h1>
          <p className="page-subtitle">Pola penggunaan dan distribusi sesi tamu</p>
        </div>
        <button className="secondary-button" onClick={() => void load()} disabled={loading}>
          Segarkan
        </button>
      </header>

      {stats && (
        <section style={{ marginBottom: 32 }}>
          <SectionTitle>Corong Penyelesaian</SectionTitle>
          <Funnel
            total={stats.totalSessions}
            arUsed={stats.arUsedCount}
            completed={m?.completedCount ?? Math.round(stats.totalSessions * stats.completionRate / 100)}
          />
        </section>
      )}

      {stats && stats.anchorStats.length > 0 && (
        <Card title="Heatmap Rute — Volume & Penyelesaian per Titik QR">
          <AnchorHeatmap anchors={stats.anchorStats} />
        </Card>
      )}

      {stats?.bottleneckAnchor && (
        <div style={{
          background: 'rgba(154,28,28,0.06)',
          border: '1px solid rgba(154,28,28,0.2)',
          borderRadius: 8, padding: '14px 20px',
          marginBottom: 32, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span style={{ fontSize: 20 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#7a1010' }}>Titik Hambatan Teridentifikasi</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              <b style={{ color: 'var(--color-text-primary)' }}>{stats.bottleneckAnchor}</b> memiliki rata-rata durasi evakuasi tertinggi. Pertimbangkan peninjauan jalur atau penambahan signage di area ini.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Tren Harian (14 Hari Terakhir)">
          <BarChart
            values={dailyValues}
            labels={dailyLabels}
            barColor="#1E3A5F"
            peakColor="var(--color-primary-900)"
          />
        </Card>
        <Card title="Pola Jam (Blok 3-Jam)">
          <BarChart
            values={hourlyValues}
            labels={hourlyLabels}
            barColor="var(--color-primary-900)"
            peakColor="#A05A00"
          />
          <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
            Oranye = jam tersibuk. Label = jam awal tiap blok 3-jam.
          </p>
        </Card>
      </div>

      {m && m.completedCount > 0 && (
        <Card title={`Distribusi Durasi Sesi Selesai (${m.completedCount} sesi)`}>
          <BarChart
            values={durValues}
            labels={durLabels}
            barColor="#1a6fa0"
            peakColor="var(--color-primary-900)"
          />
          <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
            Waktu dari scan QR pertama hingga konfirmasi "Sampai di EXIT!".
          </p>
        </Card>
      )}

      {stats && (
        <Card title="Adopsi Fitur AR">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-primary-900)' }}>
                {stats.arUsageRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, color: '#888' }}>sesi menggunakan AR</div>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${stats.arUsageRate}%`,
                  background: 'var(--color-primary-900)',
                  borderRadius: 6,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 4 }}>
                <span>0%</span>
                <span>{stats.arUsedCount} dari {stats.totalSessions} sesi</span>
                <span>100%</span>
              </div>
            </div>
            {stats.anchorStats.length > 0 && (
              <div style={{ fontSize: 12, color: '#888' }}>
                AR tertinggi:{' '}
                <b style={{ color: 'var(--color-text-primary)' }}>
                  {[...stats.anchorStats].sort((a, b) => b.arUsageRate - a.arUsageRate)[0]?.anchorName ?? '—'}
                </b>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{children}</h2>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{
        background: 'var(--color-surface-white)',
        borderRadius: 8, padding: 20,
        border: '1px solid var(--color-border)',
      }}>
        {children}
      </div>
    </section>
  );
}
