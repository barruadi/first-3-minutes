import {
  AnalyticsSummarySchema,
  LocationListSchema,
  QrProvisionResponseSchema,
  ComplianceReportResponseSchema,
  FloorPlanListSchema,
  ApiErrorSchema,
  type AnalyticsSummary,
  type Location,
  type QrProvisionResponse,
  type ComplianceReportResponse,
  type FloorPlan,
  type ComplianceReportRequest,
} from '@3minutes/contracts';

const BASE_URL = import.meta.env['VITE_ADMIN_API_BASE_URL'] ?? '';

export interface GuestSession {
  id: string;
  anchor_id: string;
  anchor_name: string;
  duration_seconds: number;
  completed: boolean;
  used_ar: boolean;
  created_at: string;
}

interface GuestSessionsResponse {
  sessions: GuestSession[];
}

const GuestSessionsSchema: Validator<GuestSessionsResponse> = {
  safeParse(data: unknown) {
    if (
      data !== null &&
      typeof data === 'object' &&
      'sessions' in data &&
      Array.isArray((data as { sessions: unknown }).sessions)
    ) {
      return { success: true, data: data as GuestSessionsResponse };
    }
    return { success: false };
  },
};

export interface AnchorStatsItem {
  anchorId: string;
  anchorName: string;
  scanId: string;
  scanCount: number;
  completionCount: number;
  completionRate: number;
  avgDurationSeconds: number | null;
  arUsedCount: number;
  arUsageRate: number;
}

export interface GuestStats {
  totalSessions: number;
  completionRate: number;
  avgDurationSeconds: number | null;
  bottleneckAnchor: string | null;
  arUsedCount: number;
  arUsageRate: number;
  anchorStats: AnchorStatsItem[];
}

const GuestStatsSchema: Validator<GuestStats> = {
  safeParse(data: unknown) {
    if (
      data !== null &&
      typeof data === 'object' &&
      'totalSessions' in data &&
      'completionRate' in data &&
      'anchorStats' in data &&
      Array.isArray((data as { anchorStats: unknown }).anchorStats)
    ) {
      // Back-fill AR fields that may be missing from older sessions
      const d = data as GuestStats;
      d.arUsedCount = d.arUsedCount ?? 0;
      d.arUsageRate = d.arUsageRate ?? 0;
      for (const a of d.anchorStats) {
        a.arUsedCount = a.arUsedCount ?? 0;
        a.arUsageRate = a.arUsageRate ?? 0;
      }
      return { success: true, data: d };
    }
    return { success: false };
  },
};

type Validator<T> = {
  safeParse: (data: unknown) =>
    | { success: true; data: T }
    | { success: false };
};

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
  }
}

const MESSAGE_BY_CODE: Record<string, string> = {
  BUILDING_SCOPE_FORBIDDEN: 'Gedung demo belum dikonfigurasi pada server.',
  LOCATION_NOT_FOUND: 'Lokasi tidak ditemukan.',
  PDF_GENERATION_FAILED: 'Laporan kepatuhan gagal dibuat.',
  VALIDATION_ERROR: 'Data yang dikirim tidak valid.',
  INTERNAL_ERROR: 'Terjadi kesalahan pada server.',
};

async function toApiError(res: Response): Promise<AdminApiError> {
  const body = await res.json().catch(() => null);
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { code, message } = parsed.data.error;
    return new AdminApiError(code, MESSAGE_BY_CODE[code] ?? message, res.status);
  }
  return new AdminApiError('INTERNAL_ERROR', `Server merespons ${res.status}.`, res.status);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal | undefined;
};

async function request<T>(
  path: string,
  schema: Validator<T>,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, signal } = options;

  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  if (signal) init.signal = signal;
  const res = await fetch(`${BASE_URL}${path}`, init);

  if (!res.ok) throw await toApiError(res);

  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new AdminApiError(
      'VALIDATION_ERROR',
      'Response server tidak sesuai contract.',
      res.status
    );
  }
  return parsed.data;
}

async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { method = 'GET', body, signal } = options;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  if (signal) init.signal = signal;
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

export const adminApi = {
  getAnalytics: (signal?: AbortSignal) =>
    request<AnalyticsSummary>('/api/admin/analytics', AnalyticsSummarySchema, { signal }),

  getLocations: (signal?: AbortSignal) =>
    request<Location[]>('/api/admin/locations', LocationListSchema, { signal }),

  getFloorPlans: async (signal?: AbortSignal): Promise<FloorPlan[]> => {
    const res = await request('/api/admin/floor-plans', FloorPlanListSchema, { signal });
    return res.items;
  },

  generateQr: (locationId: string, signal?: AbortSignal) =>
    request<QrProvisionResponse>(
      `/api/admin/locations/${encodeURIComponent(locationId)}/rescue-qr`,
      QrProvisionResponseSchema,
      { method: 'POST', signal }
    ),

  createComplianceReport: (body: ComplianceReportRequest, signal?: AbortSignal) =>
    request<ComplianceReportResponse>(
      '/api/admin/compliance-reports',
      ComplianceReportResponseSchema,
      { method: 'POST', body, signal }
    ),

  downloadComplianceReport: (reportId: string, signal?: AbortSignal) =>
    requestBlob(`/api/admin/compliance-reports/${encodeURIComponent(reportId)}/download`, {
      signal,
    }),

  getGuestSessions: async (signal?: AbortSignal): Promise<GuestSession[]> => {
    const res = await request<GuestSessionsResponse>(
      '/api/admin/guest-sessions',
      GuestSessionsSchema,
      { signal }
    );
    return res.sessions;
  },

  getGuestStats: async (signal?: AbortSignal): Promise<GuestStats> => {
    return request<GuestStats>('/api/admin/guest-stats', GuestStatsSchema, { signal });
  },
};
