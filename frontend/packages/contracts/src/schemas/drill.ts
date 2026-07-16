import { z } from 'zod';
import { AccessibilityModeSchema, type GuidanceEvent } from './accessibility.js';
import { SpatialMapSchema, type SpatialMap } from './spatial.js';
import { TierSchema } from './common.js';

export const DrillSessionSchema = z.object({
  drillId: z.string(),
  scanId: z.string(),
  installationId: z.string(),
  startedAt: z.string().datetime(),
});
export type DrillSession = z.infer<typeof DrillSessionSchema>;

export const DrillMetricsSchema = z.object({
  scanId: z.string(),
  reactionTimeMs: z.number().int().min(0),
  evacuationTimeMs: z.number().int().min(0),
  postureScorePercentage: z.number().min(0).max(100),
  completedAtDevice: z.string().datetime(),
});
export type DrillMetrics = z.infer<typeof DrillMetricsSchema>;

export const DrillCompletionResponseSchema = z.object({
  drillId: z.string(),
  accepted: z.boolean(),
  rewardEligible: z.boolean(),
  safetyRating: z.number().min(0).max(100),
  tier: TierSchema,
  recordedAt: z.string().datetime(),
});
export type DrillCompletionResponse = z.infer<typeof DrillCompletionResponseSchema>;

/**
 * Batas integrasi Domain 1 ↔ Domain 2 — FROZEN v1.
 * Sumber: prompts/agents/03-coder/domain-1-b2c-mobile.md dan domain-2-ar-sensor.md.
 *
 * Domain 1 memiliki navigation dan submission metrics. Domain 2 memiliki
 * drill state machine dan HANYA mengembalikan outcome melalui contract ini.
 * Domain 2 tidak memanggil endpoint rating sendiri.
 */
export const DrillFailureReasonSchema = z.enum([
  'TIMER_EXPIRED',
  'SENSOR_UNAVAILABLE',
  'TRACKING_LOST',
  'INTERRUPTED',
  'INTERNAL_ERROR',
]);
export type DrillFailureReason = z.infer<typeof DrillFailureReasonSchema>;

/**
 * Input tidak memiliki Zod schema runtime karena memuat callback function.
 * Type-only; validasi terjadi pada spatialMap melalui SpatialMapSchema.
 */
export type DrillLaunchInput = {
  spatialMap: SpatialMap;
  scanId: string;
  accessibilityMode: AccessibilityMode;
  /** Domain 2 memancarkan event semantik; Domain 1 yang mengucapkannya. */
  announceGuidance: (event: GuidanceEvent) => void;
};

/** Runtime schema untuk bagian outcome yang serializable. */
export const DrillOutcomeSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    metrics: DrillMetricsSchema,
  }),
  z.object({
    status: z.literal('failure'),
    failureReason: DrillFailureReasonSchema,
    /** Failure boleh mengembalikan partial metrics; consumer tidak boleh mengasumsikan ada. */
    metrics: DrillMetricsSchema.partial().optional(),
  }),
]);
export type DrillOutcome = z.infer<typeof DrillOutcomeSchema>;

/** Guard agar Domain 1 tidak menerima input drill yang tidak valid. */
export const DrillLaunchSpatialGuardSchema = z.object({
  spatialMap: SpatialMapSchema,
  scanId: z.string().min(1),
  accessibilityMode: AccessibilityModeSchema,
});
