import {
  DrillCompletionResponseSchema, ResidentHomeResponseSchema, SpatialMapSchema,
  ResidentRewardsResponseSchema, ResidentHistoryResponseSchema,
  type DrillMetrics, type ResidentHomeResponse, type SpatialMap,
  type DrillCompletionResponse, type ResidentRewardsResponse, type ResidentHistoryResponse,
} from '@3minutes/contracts';

const BASE_URL = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:8000';
const API = '/api';

export class ApiClientError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly retryable: boolean) { super(message); }
}

async function request<T>(path: string, parser: (value: unknown) => T, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${API}${path}`, {
      ...options,
      headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const envelope = body as { error?: { code?: string; message?: string }; detail?: { error?: { code?: string; message?: string } } } | null;
      const error = envelope?.error ?? envelope?.detail?.error;
      const timeout = res.status === 504;
      throw new ApiClientError(error?.message ?? (timeout ? 'Analisis ruangan melewati batas waktu.' : 'Permintaan gagal.'), error?.code ?? (timeout ? 'AI_TIMEOUT' : 'HTTP_ERROR'), res.status, timeout || res.status >= 500);
    }
    return parser(body);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiClientError('Tidak dapat terhubung ke server. Periksa jaringan lalu coba lagi.', 'NETWORK_ERROR', 0, true);
  }
}

export const residentApi = {
  getHome: (installationId: string, signal?: AbortSignal) =>
    request(`/resident/home?installationId=${encodeURIComponent(installationId)}`, (data) => ResidentHomeResponseSchema.parse(data), { signal }),
  uploadScan: (formData: FormData, signal?: AbortSignal) =>
    request('/scans/spatial-map', (data) => SpatialMapSchema.parse(data), { method: 'POST', body: formData, signal }),
  completeDrill: (drillId: string, metrics: DrillMetrics, signal?: AbortSignal) =>
    request(`/drills/${encodeURIComponent(drillId)}/complete`, (data) => DrillCompletionResponseSchema.parse(data), { method: 'POST', body: JSON.stringify(metrics), signal }),
  getRewards: (installationId: string, signal?: AbortSignal) =>
    request(`/resident/rewards?installationId=${encodeURIComponent(installationId)}`, (data) => ResidentRewardsResponseSchema.parse(data), { signal }),
  getHistory: (installationId: string, limit = 20, signal?: AbortSignal) =>
    request(`/resident/history?installationId=${encodeURIComponent(installationId)}&limit=${limit}`, (data) => ResidentHistoryResponseSchema.parse(data), { signal }),
};

export type { SpatialMap, DrillCompletionResponse, ResidentHomeResponse, ResidentRewardsResponse, ResidentHistoryResponse };
