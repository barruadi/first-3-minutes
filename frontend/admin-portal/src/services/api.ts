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

// ---------------------------------------------------------------------------
// Guest drill session types — not yet in @3minutes/contracts
// ---------------------------------------------------------------------------

export interface GuestSession {
  id: string;
  anchor_id: string;
  anchor_name: string;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
}

interface GuestSessionsResponse {
  sessions: GuestSession[];
}

/** Minimal inline validator for the guest-sessions response. */
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

/**
 * Bentuk minimal schema yang dibutuhkan client. Dideklarasikan secara
 * struktural agar admin-portal tidak perlu mendepend zod secara langsung;
 * seluruh Zod schema memenuhi bentuk ini.
 */
type Validator<T> = {
  safeParse: (data: unknown) =>
    | { success: true; data: T }
    | { success: false };
};

/**
 * Error yang membawa `code` stabil dari envelope backend (architecture.md §9).
 * Komponen melakukan branching pada `code`, bukan pada `message`.
 */
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

/** Pesan ramah pengguna per error code frozen. */
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
  // Server mengembalikan sesuatu di luar envelope — jangan menebak isinya.
  return new AdminApiError('INTERNAL_ERROR', `Server merespons ${res.status}.`, res.status);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal | undefined;
};

/**
 * Memvalidasi response dengan schema frozen. Cast `as T` sebelumnya membuat
 * contract drift muncul sebagai undefined acak di dalam komponen, bukan di
 * batas jaringan tempat penyebabnya terlihat.
 */
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

/** Untuk QR dan PDF yang dikembalikan sebagai file, bukan JSON. */
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

  /** Server membungkus hasil dalam `items`; kembalikan array untuk pemanggil. */
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

  /**
   * TIDAK mengirim buildingId. Server SELALU memakai DEMO_BUILDING_ID dari
   * settings dan mengabaikan scope building dari client (ADR-004,
   * architecture.md §10.6/§11).
   */
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
};
