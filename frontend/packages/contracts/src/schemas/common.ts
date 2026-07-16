import { z } from 'zod';

export const Coordinate3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Coordinate3D = z.infer<typeof Coordinate3DSchema>;

export const SpatialObjectSchema = z.object({
  id: z.string(),
  type: z.enum(['SAFE_ZONE', 'HAZARD_ZONE', 'EXIT_POINT']),
  label: z.string(),
  position: Coordinate3DSchema,
  confidence: z.number().min(0).max(1).optional(),
});
export type SpatialObject = z.infer<typeof SpatialObjectSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
