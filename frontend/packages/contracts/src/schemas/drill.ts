import { z } from 'zod';

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
  tier: z.enum(['Platinum', 'Gold', 'Silver']),
  recordedAt: z.string().datetime(),
});
export type DrillCompletionResponse = z.infer<typeof DrillCompletionResponseSchema>;
