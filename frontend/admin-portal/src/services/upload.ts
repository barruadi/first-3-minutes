import { FloorPlanSchema, type FloorPlan } from '@3minutes/contracts';
import { AdminApiError } from './api.js';

const BASE_URL = import.meta.env['VITE_ADMIN_API_BASE_URL'] ?? 'http://localhost:8000';

/** Validasi client-side murni UX; backend tetap wajib memvalidasi ulang. */
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateFloorPlanFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return 'Format tidak didukung. Gunakan PNG, JPEG, WebP, atau PDF.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran maksimal ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * Uses XMLHttpRequest instead of fetch because fetch doesn't expose upload
 * progress events, which are needed for the progress indicator.
 */
export function uploadFloorPlan(
  file: File,
  opts: { name: string; onProgress?: (pct: number) => void; signal?: AbortSignal }
): Promise<FloorPlan> {
  const { name, onProgress, signal } = opts;

  return new Promise<FloorPlan>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/api/admin/floor-plans`);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const code = xhr.response?.error?.code ?? 'INTERNAL_ERROR';
        const message = xhr.response?.error?.message ?? `Server merespons ${xhr.status}.`;
        reject(new AdminApiError(code, message, xhr.status));
        return;
      }
      const parsed = FloorPlanSchema.safeParse(xhr.response);
      if (!parsed.success) {
        reject(
          new AdminApiError(
            'VALIDATION_ERROR',
            'Response floor plan tidak sesuai contract.',
            xhr.status
          )
        );
        return;
      }
      resolve(parsed.data);
    };

    xhr.onerror = () => reject(new AdminApiError('INTERNAL_ERROR', 'Upload gagal.', 0));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
