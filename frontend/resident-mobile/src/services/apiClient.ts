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

// ── Building scan / anchor types ─────────────────────────────────────────────

export interface BuildingScanResult {
  id: string;
  floorPlanUrl: string;
  meshUrl: string;
  createdAt: string;
}

export interface AnchorResult {
  id: string;
  name: string;
  posX: number;
  posZ: number;
  isExit: boolean;
  scanId: string;
}

function parseAnchor(d: Record<string, unknown>): AnchorResult {
  return {
    id: d['id'] as string,
    name: d['name'] as string,
    posX: (d['pos_x'] ?? d['posX']) as number,
    posZ: (d['pos_z'] ?? d['posZ']) as number,
    isExit: (d['is_exit'] ?? d['isExit']) as boolean,
    scanId: (d['scan_id'] ?? d['scanId']) as string,
  };
}

// ── Building API ──────────────────────────────────────────────────────────────

export const buildingApi = {
  uploadScan: (floorPlanUri: string, meshUri: string, signal?: AbortSignal): Promise<BuildingScanResult> => {
    const form = new FormData();
    form.append('floor_plan', { uri: floorPlanUri, name: 'floor_plan.png', type: 'image/png' } as never);
    form.append('mesh', { uri: meshUri, name: 'mesh.obj', type: 'model/obj' } as never);
    return request('/buildings/scan', (data) => {
      const d = data as Record<string, unknown>;
      const id = d['id'] as string;
      // Backend returns absolute URL with its own host; replace with the configured BASE_URL
      // so the image loads correctly from the device.
      const rawFloorPlan = ((d['floor_plan_url'] ?? d['floorPlanUrl']) as string | undefined) ?? '';
      const floorPlanUrl = rawFloorPlan
        ? rawFloorPlan.replace(/^https?:\/\/[^/]+/, BASE_URL)
        : `${BASE_URL}/uploads/floor_plans/${id}.png`;
      return {
        id,
        floorPlanUrl,
        meshUrl: (d['mesh_url'] ?? d['meshUrl']) as string,
        createdAt: (d['created_at'] ?? d['createdAt']) as string,
      };
    }, { method: 'POST', body: form, signal });
  },

  createAnchor: (scanId: string, name: string, posX: number, posZ: number, isExit: boolean, signal?: AbortSignal): Promise<AnchorResult> =>
    request(`/buildings/${encodeURIComponent(scanId)}/anchors`,
      (data) => parseAnchor(data as Record<string, unknown>),
      { method: 'POST', body: JSON.stringify({ name, pos_x: posX, pos_z: posZ, is_exit: isExit }), signal }),

  getAnchors: (scanId: string, signal?: AbortSignal): Promise<AnchorResult[]> =>
    request(`/buildings/${encodeURIComponent(scanId)}/anchors`,
      (data) => (data as Array<Record<string, unknown>>).map(parseAnchor),
      { signal }),

  deleteAnchor: (scanId: string, anchorId: string, signal?: AbortSignal): Promise<void> =>
    request(`/buildings/${encodeURIComponent(scanId)}/anchors/${encodeURIComponent(anchorId)}`,
      () => undefined,
      { method: 'DELETE', signal }),
};

// ── Resident API (unchanged) ──────────────────────────────────────────────────

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
