import React, { useId, useMemo, useState } from 'react';
import type { EscapeRouteTrendPoint, SafetyMatrixCell } from '@3minutes/contracts';

/**
 * Ramp sequential satu hue (Earth Brown), terang -> gelap.
 *
 * design.md §1: warna fungsional (merah danger) hanya boleh dalam konteks
 * simulasi drill; halaman umum memakai brand palette. Karena itu magnitude
 * failure rate memakai ramp brand, bukan merah.
 */
const FAILURE_RAMP = ['#F3E4C9', '#E3C9A5', '#CBA47B', '#A97B52', '#8B5E3C'] as const;

/** Ink pada tiap step agar teks tetap terbaca saat step menggelap. */
const FAILURE_RAMP_INK = ['#0A2947', '#0A2947', '#0A2947', '#FFFFFF', '#FFFFFF'] as const;

const AXIS_INK = '#475665';
const GRID = 'rgba(10, 41, 71, 0.12)';
const SERIES = '#0A2947';

function rampIndex(pct: number): number {
  if (pct <= 0) return 0;
  const idx = Math.floor((pct / 100) * FAILURE_RAMP.length);
  return Math.min(idx, FAILURE_RAMP.length - 1);
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// --- Trend ---

type TrendChartProps = {
  points: EscapeRouteTrendPoint[];
  height?: number;
};

/**
 * Satu seri berubah terhadap waktu -> line chart. Seri tunggal tidak memakai
 * legend box; judul section yang menamainya. Label langsung hanya pada titik
 * pertama dan terakhir, bukan setiap titik.
 */
export function TrendChart({ points, height = 180 }: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const padX = 16;
    const padTop = 16;
    const padBottom = 28;
    const width = 100; // viewBox units; SVG diskalakan responsif.
    const values = points.map((p) => p.averageEvacuationTimeMs);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Beri headroom agar garis tidak menempel pada tepi saat semua nilai sama.
    const span = max - min || Math.max(max, 1);
    const lo = min - span * 0.15;
    const hi = max + span * 0.15;

    const plotH = height - padTop - padBottom;
    const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

    const coords = points.map((p, i) => ({
      x: padX + i * stepX,
      y: padTop + plotH * (1 - (p.averageEvacuationTimeMs - lo) / (hi - lo)),
      point: p,
    }));

    return { coords, padTop, plotH, width };
  }, [points, height]);

  if (!geom) {
    return <p style={{ color: AXIS_INK, fontSize: 13 }}>Belum ada data tren.</p>;
  }

  const { coords, padTop, plotH, width } = geom;
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const active = hover !== null ? coords[hover] : null;

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`Tren rata-rata waktu evakuasi untuk ${points.length} periode`}
        onMouseLeave={() => setHover(null)}
      >
        <clipPath id={clipId}>
          <rect x="0" y="0" width={width} height={height} />
        </clipPath>

        {/* Grid resesif: hanya dua garis referensi. */}
        {[0, 1].map((i) => (
          <line
            key={i}
            x1="0"
            x2={width}
            y1={padTop + plotH * i}
            y2={padTop + plotH * i}
            stroke={GRID}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path
          d={path}
          fill="none"
          stroke={SERIES}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${clipId})`}
        />

        {coords.map((c, i) => (
          <g key={c.point.period}>
            {/* Hit target lebih besar dari mark. */}
            <rect
              x={c.x - 4}
              y={0}
              width={8}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: 'pointer' }}
            />
            <circle
              cx={c.x}
              cy={c.y}
              r={hover === i ? 3.5 : 2.5}
              fill={SERIES}
              stroke="#FFFFFF"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          </g>
        ))}

        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1={padTop}
            y2={padTop + plotH}
            stroke={GRID}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Label langsung selektif: periode pertama dan terakhir saja. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: AXIS_INK, marginTop: 4 }}>
        <span>{points[0]?.period}</span>
        <span>{points[points.length - 1]?.period}</span>
      </div>

      <figcaption
        aria-live="polite"
        style={{ fontSize: 13, color: AXIS_INK, marginTop: 8, minHeight: 20 }}
      >
        {active
          ? `${active.point.period}: ${seconds(active.point.averageEvacuationTimeMs)} rata-rata evakuasi`
          : `Rentang ${points[0]?.period}–${points[points.length - 1]?.period}. Arahkan kursor untuk detail.`}
      </figcaption>
    </figure>
  );
}

// --- Heatmap ---

type HeatmapProps = {
  cells: SafetyMatrixCell[];
  onSelect?: (locationRef: string) => void;
};

/**
 * Magnitude per lokasi -> sequential, satu hue terang->gelap.
 * Identitas tidak pernah color-alone: setiap cell menampilkan angka dan label,
 * dan tersedia table view di bawahnya.
 */
export function HeatmapMatrix({ cells, onSelect }: HeatmapProps) {
  const [hover, setHover] = useState<string | null>(null);

  if (cells.length === 0) {
    return <p style={{ color: AXIS_INK, fontSize: 13 }}>Belum ada data lokasi.</p>;
  }

  const active = cells.find((c) => c.locationRef === hover) ?? null;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 2, // spacer 2px antar fill
        }}
      >
        {cells.map((cell) => {
          const idx = rampIndex(cell.failureRatePercentage);
          return (
            <button
              key={cell.locationRef}
              type="button"
              onMouseEnter={() => setHover(cell.locationRef)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(cell.locationRef)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect?.(cell.locationRef)}
              aria-label={`${cell.locationRef}: ${cell.failureRatePercentage.toFixed(1)} persen gagal, ${seconds(cell.averageEvacuationTimeMs)} rata-rata evakuasi, ${cell.sampleCount} sampel`}
              style={{
                background: FAILURE_RAMP[idx],
                color: FAILURE_RAMP_INK[idx],
                border: 'none',
                borderRadius: 4,
                padding: '12px 10px',
                textAlign: 'left',
                cursor: onSelect ? 'pointer' : 'default',
                font: 'inherit',
                outlineOffset: 2,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {cell.failureRatePercentage.toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{cell.locationRef}</div>
            </button>
          );
        })}
      </div>

      {/* Scale legend untuk ramp sequential. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 11, color: AXIS_INK }}>0% gagal</span>
        <div style={{ display: 'flex', gap: 2, flex: 1, maxWidth: 160 }}>
          {FAILURE_RAMP.map((c) => (
            <div key={c} style={{ background: c, height: 8, flex: 1, borderRadius: 2 }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: AXIS_INK }}>100%</span>
      </div>

      <p aria-live="polite" style={{ fontSize: 13, color: AXIS_INK, marginTop: 8, minHeight: 20 }}>
        {active
          ? `${active.locationRef}: ${seconds(active.averageEvacuationTimeMs)} rata-rata evakuasi dari ${active.sampleCount} sampel`
          : 'Arahkan kursor pada lokasi untuk detail.'}
      </p>
    </div>
  );
}

/** Table view — identitas dan nilai tidak boleh hanya lewat warna. */
export function HeatmapTable({ cells }: { cells: SafetyMatrixCell[] }) {
  if (cells.length === 0) return null;
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ fontSize: 13, color: AXIS_INK, cursor: 'pointer' }}>
        Lihat sebagai tabel
      </summary>
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Lokasi', 'Gagal', 'Rata-rata evakuasi', 'Sampel'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${GRID}`, color: AXIS_INK, fontWeight: 600 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((c) => (
              <tr key={c.locationRef}>
                <td style={{ padding: '6px 8px', borderBottom: `1px solid ${GRID}` }}>{c.locationRef}</td>
                <td style={{ padding: '6px 8px', borderBottom: `1px solid ${GRID}` }}>{c.failureRatePercentage.toFixed(1)}%</td>
                <td style={{ padding: '6px 8px', borderBottom: `1px solid ${GRID}` }}>{seconds(c.averageEvacuationTimeMs)}</td>
                <td style={{ padding: '6px 8px', borderBottom: `1px solid ${GRID}` }}>{c.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
