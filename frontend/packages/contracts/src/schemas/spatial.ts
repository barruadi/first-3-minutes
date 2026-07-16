import { z } from 'zod';
import { Coordinate3DSchema, SpatialObjectSchema } from './common.js';

export const SpatialMapSourceSchema = z.enum(['gemini', 'fallback']);
export type SpatialMapSource = z.infer<typeof SpatialMapSourceSchema>;

/** Bentuk dasar SpatialMap tanpa aturan minimum. Gunakan SpatialMapSchema. */
export const SpatialMapBaseSchema = z.object({
  scanId: z.string().min(1),
  origin: Coordinate3DSchema,
  safeZones: z.array(SpatialObjectSchema),
  hazardZones: z.array(SpatialObjectSchema),
  exitPoints: z.array(SpatialObjectSchema),
  source: SpatialMapSourceSchema,
  createdAt: z.string().datetime(),
});

/**
 * SpatialMap — bentuk wire, mengikuti SpatialMapResponse milik Domain 3.
 *
 * Schema ini sengaja TIDAK memaksakan minimum safe/exit. Backend tidak
 * menjaminnya di tingkat schema, sehingga client yang lebih ketat akan menolak
 * response yang dianggap sah oleh server dan menjatuhkan Domain 1/2.
 */
export const SpatialMapSchema = SpatialMapBaseSchema;
export type SpatialMap = z.infer<typeof SpatialMapSchema>;

/**
 * Guard terpisah untuk kesiapan drill (architecture.md §8.3: minimal satu safe
 * zone dan satu exit point). Domain 2 memanggil ini sebelum memulai drill,
 * bukan saat parsing response.
 *
 * OPEN: apakah minimum ini dijamin server (fallback) atau diperiksa client
 * masih menunggu keputusan Architect — lihat integration.md.
 */
export function isDrillReady(map: SpatialMap): boolean {
  return map.safeZones.length >= 1 && map.exitPoints.length >= 1;
}
