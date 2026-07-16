import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { FloorPlan, Location } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import EmptyState from '../components/EmptyState.js';
import { adminApi, AdminApiError } from '../services/api.js';
import { uploadFloorPlan, validateFloorPlanFile } from '../services/upload.js';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; pct: number }
  | { status: 'done'; plan: FloorPlan }
  | { status: 'error'; message: string };

export default function LocationsPage() {
  const [params] = useSearchParams();
  const highlightRef = params.get('ref');

  const [locations, setLocations] = useState<Location[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [floorPlansUnavailable, setFloorPlansUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const locs = await adminApi.getLocations(controller.signal);
      if (controller.signal.aborted) return;
      setLocations(locs);

      // Endpoint floor plan belum diimplementasikan Domain 3 (D3-003).
      // Kegagalannya tidak boleh menjatuhkan daftar lokasi.
      try {
        const plans = await adminApi.getFloorPlans(controller.signal);
        if (!controller.signal.aborted) {
          setFloorPlans(plans);
          setFloorPlansUnavailable(false);
        }
      } catch {
        if (!controller.signal.aborted) setFloorPlansUnavailable(true);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Gagal memuat lokasi');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const onPickFile = useCallback(
    async (file: File) => {
      const validationError = validateFloorPlanFile(file);
      if (validationError) {
        setUpload({ status: 'error', message: validationError });
        return;
      }
      setUpload({ status: 'uploading', pct: 0 });
      try {
        const plan = await uploadFloorPlan(file, {
          name: file.name.replace(/\.[^.]+$/, ''),
          onProgress: (pct) => setUpload({ status: 'uploading', pct }),
        });
        setUpload({ status: 'done', plan });
        void load(); // refresh daftar setelah upload
      } catch (e) {
        const message =
          e instanceof AdminApiError && e.code === 'VALIDATION_ERROR'
            ? 'Server belum mengembalikan floor plan sesuai contract (D3-003).'
            : e instanceof Error
              ? e.message
              : 'Upload gagal';
        setUpload({ status: 'error', message });
      }
    },
    [load]
  );

  const sorted = useMemo(
    () => [...locations].sort((a, b) => a.locationRef.localeCompare(b.locationRef)),
    [locations]
  );

  if (loading) return <LoadingState message="Memuat lokasi..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Manajemen Lokasi</h1>

      <section style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Denah Lantai</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Unggah denah untuk gedung demo. Format PNG, JPEG, WebP, atau PDF (maks. 10 MB).
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.status === 'uploading'}
          style={button(upload.status === 'uploading')}
        >
          {upload.status === 'uploading' ? `Mengunggah ${upload.pct}%` : 'Pilih file denah'}
        </button>

        {upload.status === 'uploading' && (
          <div
            role="progressbar"
            aria-valuenow={upload.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              marginTop: 12,
              height: 6,
              background: 'var(--color-surface-muted)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${upload.pct}%`,
                height: '100%',
                background: 'var(--color-primary-900)',
                transition: 'width 120ms linear',
              }}
            />
          </div>
        )}

        <div aria-live="polite" style={{ marginTop: 12, minHeight: 20, fontSize: 13 }}>
          {upload.status === 'error' && (
            <span style={{ color: 'var(--color-error)' }}>{upload.message}</span>
          )}
          {upload.status === 'done' && (
            <span style={{ color: 'var(--color-success)' }}>
              Denah "{upload.plan.name}" terunggah.
            </span>
          )}
        </div>

        {floorPlansUnavailable ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 12 }}>
            Daftar denah belum tersedia dari server.
          </p>
        ) : floorPlans.length > 0 ? (
          <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13 }}>
            {floorPlans.map((p) => (
              <li key={p.id} style={{ padding: '2px 0' }}>
                {p.name}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Lokasi</h2>
        {sorted.length === 0 ? (
          <EmptyState message="Belum ada lokasi" hint="Unggah denah lalu tambahkan lokasi." />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {sorted.map((loc) => {
              const highlighted = highlightRef === loc.locationRef;
              return (
                <Link key={loc.id} to={`/locations/${loc.id}`} style={{ display: 'block' }}>
                  <div
                    style={{
                      ...card,
                      padding: 16,
                      borderColor: highlighted ? 'var(--color-accent-earth)' : 'var(--color-border)',
                      borderWidth: highlighted ? 2 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{loc.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      {loc.locationRef}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--color-surface-white)',
  borderRadius: 8,
  padding: 20,
  border: '1px solid var(--color-border)',
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
