import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Location } from '@3minutes/contracts';
import LoadingState from '../components/LoadingState.js';
import ErrorState from '../components/ErrorState.js';
import EmptyState from '../components/EmptyState.js';
import { adminApi } from '../services/api.js';

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getLocations();
      setLocations(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat lokasi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingState message="Memuat lokasi..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (locations.length === 0) return <EmptyState message="Belum ada lokasi" hint="Tambahkan lokasi melalui floor plan manager" />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Manajemen Lokasi</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        {locations.map((loc) => (
          <Link key={loc.id} to={`/locations/${loc.id}`}>
            <div style={{
              background: 'var(--color-surface-white)',
              borderRadius: 8,
              padding: 16,
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 600 }}>{loc.label}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{loc.locationRef}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
