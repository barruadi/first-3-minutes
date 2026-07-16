import { GuestRouteSchema, ApiErrorSchema, type GuestRoute } from '@3minutes/contracts';

const BASE_URL = import.meta.env['VITE_GUEST_API_BASE_URL'] ?? 'http://localhost:8000';

export type GuestErrorCode = 'QR_TOKEN_INVALID' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';

export class GuestApiError extends Error {
  readonly code: GuestErrorCode;
  constructor(code: GuestErrorCode, message: string) {
    super(message);
    this.name = 'GuestApiError';
    this.code = code;
  }
}

/**
 * Token opaque -> GuestRoute. Tanpa auth (PRD §9).
 *
 * Fail closed: token invalid/expired TIDAK PERNAH menghasilkan route.
 * Response divalidasi dengan schema frozen — sebelumnya di-cast `as
 * Promise<GuestRoute>`, sehingga route rusak akan lolos ke scene AR dan
 * mengarahkan tamu ke koordinat sampah saat keadaan darurat.
 */
export async function resolveGuestToken(
  token: string,
  signal?: AbortSignal
): Promise<GuestRoute> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/guest/rescue/${encodeURIComponent(token)}`, { signal: signal ?? null });
  } catch {
    throw new GuestApiError('NETWORK_ERROR', 'Layanan tidak dapat dijangkau.');
  }

  // 404/410 = token tidak dikenal atau dicabut (architecture.md §10.10).
  if (res.status === 404 || res.status === 410) {
    throw new GuestApiError('QR_TOKEN_INVALID', 'Kode QR tidak berlaku.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const parsed = ApiErrorSchema.safeParse(body);
    if (parsed.success && parsed.data.error.code === 'QR_TOKEN_INVALID') {
      throw new GuestApiError('QR_TOKEN_INVALID', 'Kode QR tidak berlaku.');
    }
    throw new GuestApiError('NETWORK_ERROR', 'Layanan tidak tersedia.');
  }

  const json = await res.json().catch(() => null);
  const parsed = GuestRouteSchema.safeParse(json);
  if (!parsed.success) {
    throw new GuestApiError('VALIDATION_ERROR', 'Data rute tidak sesuai contract.');
  }
  return parsed.data;
}
