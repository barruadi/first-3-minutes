import type { ResidentProfile, SpatialMap, DrillMetrics, DrillCompletionResponse } from '@3minutes/contracts';

const BASE_URL = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText, details: null } }));
    throw Object.assign(new Error(body?.error?.message ?? res.statusText), { apiError: body });
  }
  return res.json() as Promise<T>;
}

export const residentApi = {
  getHome: (installationId: string) =>
    request<ResidentProfile>(`/api/resident/home?installationId=${encodeURIComponent(installationId)}`),

  uploadScan: (formData: FormData) =>
    fetch(`${BASE_URL}/api/scans/spatial-map`, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Upload gagal');
      return res.json() as Promise<SpatialMap>;
    }),

  completeDrill: (drillId: string, metrics: DrillMetrics) =>
    request<DrillCompletionResponse>(`/api/drills/${encodeURIComponent(drillId)}/complete`, {
      method: 'POST',
      body: JSON.stringify(metrics),
    }),

  getRewards: (installationId: string) =>
    request<unknown>(`/api/resident/rewards?installationId=${encodeURIComponent(installationId)}`),

  getHistory: (installationId: string, limit = 20) =>
    request<unknown>(`/api/resident/history?installationId=${encodeURIComponent(installationId)}&limit=${limit}`),
};
