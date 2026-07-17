/**
 * API client for the new anchor-based drill flow.
 * Backend: GET /api/anchors/{anchorId}
 *          POST /api/guest/drill-session
 */

const BASE_URL = import.meta.env['VITE_GUEST_API_BASE_URL'] ?? 'http://localhost:8000';

export interface AnchorSummary {
  id: string;
  name: string;
  posX: number;
  posZ: number;
  isExit: boolean;
}

export interface AnchorData {
  id: string;
  scanId: string;
  name: string;
  posX: number;
  posZ: number;
  isExit: boolean;
  floorPlanUrl: string;
  anchors: AnchorSummary[];
  /** Meters per floor-plan pixel. 0 means metadata not present — use fallback. */
  scaleMetersPerPixel: number;
  /** World X coordinate at floor-plan pixel column 0. */
  originX: number;
  /** World Z coordinate at floor-plan pixel row (height - 1). */
  originZ: number;
}

export interface DrillSessionPayload {
  anchor_id: string;
  duration_seconds: number;
  completed: boolean;
  used_ar?: boolean;
}

export interface DrillSessionResponse {
  id: string;
}

export class AnchorApiError extends Error {
  readonly code: 'NOT_FOUND' | 'NETWORK_ERROR' | 'INVALID_RESPONSE';
  constructor(code: AnchorApiError['code'], message: string) {
    super(message);
    this.name = 'AnchorApiError';
    this.code = code;
  }
}

/**
 * Fetch anchor data for a given anchor UUID.
 * Throws AnchorApiError on failure.
 */
export async function fetchAnchor(
  anchorId: string,
  signal?: AbortSignal
): Promise<AnchorData> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/anchors/${encodeURIComponent(anchorId)}`, {
      signal: signal ?? null,
    });
  } catch {
    throw new AnchorApiError('NETWORK_ERROR', 'Cannot reach server. Check your connection.');
  }

  if (res.status === 404) {
    throw new AnchorApiError('NOT_FOUND', 'QR code anchor not found on server.');
  }

  if (!res.ok) {
    throw new AnchorApiError('NETWORK_ERROR', `Server error ${res.status}. Try again.`);
  }

  const json: unknown = await res.json().catch(() => null);
  if (
    !json ||
    typeof json !== 'object' ||
    !('id' in json) ||
    !('anchors' in json)
  ) {
    throw new AnchorApiError('INVALID_RESPONSE', 'Unexpected response format from server.');
  }

  const raw = json as Record<string, unknown>;
  const data: AnchorData = {
    ...(raw as unknown as AnchorData),
    scaleMetersPerPixel:
      typeof raw['scaleMetersPerPixel'] === 'number' ? raw['scaleMetersPerPixel'] : 0,
    originX: typeof raw['originX'] === 'number' ? raw['originX'] : 0,
    originZ: typeof raw['originZ'] === 'number' ? raw['originZ'] : 0,
  };
  return data;
}

/**
 * Submit drill session result.
 * Fire-and-forget safe: does not throw on non-critical failure.
 */
export async function submitDrillSession(
  payload: DrillSessionPayload
): Promise<DrillSessionResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/guest/drill-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as DrillSessionResponse;
  } catch {
    return null;
  }
}
