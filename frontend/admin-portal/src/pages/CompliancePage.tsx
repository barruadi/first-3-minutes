import React, { useCallback, useRef, useState } from 'react';
import { adminApi, AdminApiError } from '../services/api.js';

const PDF_BUDGET_MS = 3000;

function defaultPeriod() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

type ExportState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'downloading' }
  | { status: 'done'; reportId: string; durationMs: number }
  | { status: 'error'; message: string };

export default function CompliancePage() {
  const initial = defaultPeriod();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [state, setState] = useState<ExportState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const periodInvalid = new Date(from) > new Date(to);

  const exportPdf = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const started = performance.now();
    setState({ status: 'creating' });

    try {
      const report = await adminApi.createComplianceReport(
        {
          periodFrom: new Date(`${from}T00:00:00Z`).toISOString(),
          periodTo: new Date(`${to}T23:59:59Z`).toISOString(),
        },
        controller.signal
      );

      if (controller.signal.aborted) return;
      setState({ status: 'downloading' });

      const blob = await adminApi.downloadComplianceReport(report.reportId, controller.signal);
      if (controller.signal.aborted) return;

      triggerDownload(blob, `kepatuhan-${from}-sd-${to}.pdf`);

      const durationMs = performance.now() - started;
      if (import.meta.env.DEV) {
        const verdict = durationMs <= PDF_BUDGET_MS ? 'OK' : 'MELEBIHI BUDGET';
        console.info(
          `[perf] compliance_pdf ${durationMs.toFixed(0)}ms (budget ${PDF_BUDGET_MS}ms) — ${verdict}`
        );
      }
      setState({ status: 'done', reportId: report.reportId, durationMs });
    } catch (e) {
      if (controller.signal.aborted) return;
      const message =
        e instanceof AdminApiError && e.code === 'PDF_GENERATION_FAILED'
          ? 'Laporan kepatuhan gagal dibuat di server.'
          : e instanceof Error
            ? e.message
            : 'Gagal membuat laporan';
      setState({ status: 'error', message });
    }
  }, [from, to]);

  const busy = state.status === 'creating' || state.status === 'downloading';

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Laporan Kepatuhan</h1>

      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Export PDF Kepatuhan</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Laporan dibuat server-side untuk gedung demo. Pilih periode lalu unduh.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Field label="Dari tanggal">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={input} />
          </Field>
          <Field label="Sampai tanggal">
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={input} />
          </Field>
        </div>

        {periodInvalid && (
          <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>
            Tanggal mulai tidak boleh melebihi tanggal akhir.
          </p>
        )}

        <button
          onClick={() => void exportPdf()}
          disabled={busy || periodInvalid}
          style={{
            padding: '10px 20px',
            background: 'var(--color-primary-900)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: busy || periodInvalid ? 'not-allowed' : 'pointer',
            fontSize: 14,
            opacity: busy || periodInvalid ? 0.6 : 1,
          }}
        >
          {state.status === 'creating'
            ? 'Membuat laporan...'
            : state.status === 'downloading'
              ? 'Mengunduh...'
              : 'Export PDF'}
        </button>

        <div aria-live="polite" style={{ marginTop: 12, minHeight: 20 }}>
          {state.status === 'error' && (
            <span style={{ color: 'var(--color-error)', fontSize: 13 }}>{state.message}</span>
          )}
          {state.status === 'done' && (
            <span style={{ color: 'var(--color-success)', fontSize: 13 }}>
              Laporan #{state.reportId} terunduh dalam {(state.durationMs / 1000).toFixed(1)}s.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Blob -> unduhan browser. Object URL wajib direvoke; tanpa itu blob PDF
 * tertahan di memori selama halaman hidup.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      {children}
    </label>
  );
}

const card: React.CSSProperties = {
  background: 'var(--color-surface-white)',
  borderRadius: 8,
  padding: 24,
  border: '1px solid var(--color-border)',
  marginBottom: 24,
};

const input: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  fontSize: 14,
  font: 'inherit',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-white)',
};
