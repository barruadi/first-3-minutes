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

const BASE_URL = import.meta.env['VITE_ADMIN_API_BASE_URL'] ?? 'http://localhost:8000';

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
  signal?: AbortSignal;
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

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

export const adminApi = {
  getAnalytics: (signal?: AbortSignal) =>
    request<AnalyticsSummary>('/api/admin/analytics', AnalyticsSummarySchema, { signal }),

  getLocations: (signal?: AbortSignal) =>
    request<Location[]>('/api/admin/locations', LocationListSchema, { signal }),

  getFloorPlans: (signal?: AbortSignal) =>
    request<FloorPlan[]>('/api/admin/floor-plans', FloorPlanListSchema, { signal }),

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
};
