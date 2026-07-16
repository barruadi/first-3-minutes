import type { AnalyticsSummary, Location, QrProvisionResponse } from '@3minutes/contracts';

const BASE_URL = import.meta.env['VITE_ADMIN_API_BASE_URL'] ?? 'http://localhost:8000';

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

export const adminApi = {
  getAnalytics: () => request<AnalyticsSummary>('/api/admin/analytics'),
  getLocations: () => request<Location[]>('/api/admin/locations'),
  generateQr: (locationId: string) =>
    request<QrProvisionResponse>(`/api/admin/locations/${locationId}/rescue-qr`, { method: 'POST' }),
  exportCompliance: (body: { buildingId: string; periodFrom: string; periodTo: string }) =>
    request<{ reportId: string }>('/api/admin/compliance-reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
