import { z } from 'zod';

export const SafetyRatingSchema = z.object({
  score: z.number().min(0).max(100),
  tier: z.enum(['Platinum', 'Gold', 'Silver']),
  lastDrillAt: z.string().datetime().nullable(),
});
export type SafetyRating = z.infer<typeof SafetyRatingSchema>;

export const RewardEligibilitySchema = z.object({
  eligible: z.boolean(),
  nextEligibleAt: z.string().datetime().nullable(),
  lastIssuedAt: z.string().datetime().nullable(),
});
export type RewardEligibility = z.infer<typeof RewardEligibilitySchema>;

export const ResidentProfileSchema = z.object({
  installationId: z.string(),
  safetyRating: SafetyRatingSchema,
  rewardEligibility: RewardEligibilitySchema,
  locationStatus: z.string().nullable(),
});
export type ResidentProfile = z.infer<typeof ResidentProfileSchema>;
