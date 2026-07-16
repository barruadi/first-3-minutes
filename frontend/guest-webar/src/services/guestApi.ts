import type { GuestRoute } from '@3minutes/contracts';

const BASE_URL = import.meta.env['VITE_GUEST_API_BASE_URL'] ?? 'http://localhost:8000';

export async function resolveGuestToken(token: string): Promise<GuestRoute> {
  const res = await fetch(`${BASE_URL}/api/guest/rescue/${encodeURIComponent(token)}`);
  if (res.status === 404 || res.status === 410) {
    throw Object.assign(new Error('Token tidak valid atau sudah kedaluwarsa'), { code: 'INVALID_TOKEN' });
  }
  if (!res.ok) {
    throw Object.assign(new Error('Layanan tidak tersedia'), { code: 'NETWORK_ERROR' });
  }
  return res.json() as Promise<GuestRoute>;
}
