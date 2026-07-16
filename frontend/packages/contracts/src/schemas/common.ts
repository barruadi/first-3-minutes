import { z } from 'zod';

export const Coordinate3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Coordinate3D = z.infer<typeof Coordinate3DSchema>;

/**
 * Tier — FROZEN v1. Dihitung server-side (PRD §7.2). Client hanya menampilkan.
 * Didefinisikan di common agar resident dan drill memakai sumber yang sama.
 */
export const TierSchema = z.enum(['Platinum', 'Gold', 'Silver']);
export type Tier = z.infer<typeof TierSchema>;

export const SpatialObjectTypeSchema = z.enum([
  'SAFE_ZONE',
  'HAZARD_ZONE',
  'EXIT_POINT',
]);
export type SpatialObjectType = z.infer<typeof SpatialObjectTypeSchema>;

export const SpatialObjectSchema = z.object({
  id: z.string(),
  type: SpatialObjectTypeSchema,
  label: z.string(),
  position: Coordinate3DSchema,
  confidence: z.number().min(0).max(1).optional(),
});
export type SpatialObject = z.infer<typeof SpatialObjectSchema>;

/**
 * Error code — FROZEN v1.
 * Sumber: prompts/agents/03-coder/domain-3-backend-ai.md "Error codes minimum".
 *
 * `code` stabil dan machine-readable. Consumer boleh melakukan branching pada
 * code ini. Menambah code baru bukan breaking change; mengubah/menghapus code
 * yang ada MEMBUTUHKAN Contract Change Request.
 */
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'SCAN_FRAME_COUNT_INVALID',
  'SCAN_IMAGE_INVALID',
  'SCAN_PAYLOAD_TOO_LARGE',
  'SPATIAL_AI_TIMEOUT',
  'SPATIAL_MAP_INVALID',
  'SCAN_NOT_FOUND',
  'DRILL_METRICS_INVALID',
  'BUILDING_SCOPE_FORBIDDEN',
  'LOCATION_NOT_FOUND',
  'QR_TOKEN_INVALID',
  'PDF_GENERATION_FAILED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Envelope error — FROZEN v1 (architecture.md §9).
 * `code` divalidasi longgar sebagai string agar client tidak crash ketika
 * server menambah code baru; gunakan ErrorCodeSchema untuk branching eksplisit.
 * `details` tidak boleh memuat stack trace atau secret.
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** HTTP mapping FROZEN untuk code yang punya status non-400. */
export const ERROR_HTTP_STATUS: Partial<Record<ErrorCode, number>> = {
  SPATIAL_AI_TIMEOUT: 504,
  SCAN_NOT_FOUND: 404,
  LOCATION_NOT_FOUND: 404,
  QR_TOKEN_INVALID: 404,
  BUILDING_SCOPE_FORBIDDEN: 403,
  PDF_GENERATION_FAILED: 500,
  INTERNAL_ERROR: 500,
};
