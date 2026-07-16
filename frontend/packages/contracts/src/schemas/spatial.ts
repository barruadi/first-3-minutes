import { z } from 'zod';
import { Coordinate3DSchema, SpatialObjectSchema } from './common.js';

export const SpatialMapSchema = z.object({
  scanId: z.string(),
  origin: Coordinate3DSchema,
  safeZones: z.array(SpatialObjectSchema),
  hazardZones: z.array(SpatialObjectSchema),
  exitPoints: z.array(SpatialObjectSchema),
  source: z.enum(['gemini', 'fallback']),
  createdAt: z.string().datetime(),
});
export type SpatialMap = z.infer<typeof SpatialMapSchema>;
