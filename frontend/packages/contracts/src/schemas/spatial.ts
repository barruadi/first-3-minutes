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
 * SpatialMap — FROZEN v1.
 * Sumber: prompts/docs/architecture.md §8.3.
 *
 * Minimum satu safe zone dan satu exit point WAJIB dipenuhi agar drill dapat
 * berjalan. Bila Gemini tidak menghasilkan minimum ini, Domain 3 menerapkan
 * fallback (source='fallback'); response tetap memenuhi schema yang sama.
 * Domain 2 karena itu boleh mengasumsikan kedua array tidak kosong.
 */
export const SpatialMapSchema = SpatialMapBaseSchema.refine(
  (map) => map.safeZones.length >= 1,
  { message: 'SpatialMap membutuhkan minimal satu safeZone agar drill dapat berjalan', path: ['safeZones'] }
).refine(
  (map) => map.exitPoints.length >= 1,
  { message: 'SpatialMap membutuhkan minimal satu exitPoint agar drill dapat berjalan', path: ['exitPoints'] }
);
export type SpatialMap = z.infer<typeof SpatialMapSchema>;
