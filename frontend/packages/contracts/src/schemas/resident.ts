import { z } from 'zod';
import { TierSchema } from './common.js';
import { SpatialMapSourceSchema } from './spatial.js';

export const SafetyRatingSchema = z.object({
  score: z.number().min(0).max(100),
  tier: TierSchema,
  lastDrillAt: z.string().datetime().nullable(),
});
export type SafetyRating = z.infer<typeof SafetyRatingSchema>;

export const RewardEligibilitySchema = z.object({
  eligible: z.boolean(),
  nextEligibleAt: z.string().datetime().nullable(),
  lastIssuedAt: z.string().datetime().nullable(),
});
export type RewardEligibility = z.infer<typeof RewardEligibilitySchema>;

/** Identitas anonim + rating. Bukan response endpoint; dipakai sebagai komposisi. */
export const ResidentProfileSchema = z.object({
  installationId: z.string().min(1),
  safetyRating: SafetyRatingSchema,
  rewardEligibility: RewardEligibilitySchema,
  locationStatus: z.string().nullable(),
});
export type ResidentProfile = z.infer<typeof ResidentProfileSchema>;

/** Ringkasan latihan terakhir untuk Home (PRD §6.1). */
export const LastDrillSummarySchema = z.object({
  drillId: z.string(),
  scanId: z.string(),
  reactionTimeMs: z.number().int().min(0),
  evacuationTimeMs: z.number().int().min(0),
  postureScorePercentage: z.number().min(0).max(100),
  safetyRating: z.number().min(0).max(100),
  tier: TierSchema,
  completedAt: z.string().datetime(),
});
export type LastDrillSummary = z.infer<typeof LastDrillSummarySchema>;

/**
 * Kesiapan spatial. Domain 1 memakai ini untuk menentukan apakah drill dapat
 * dimulai tanpa menghitung apa pun secara lokal.
 */
export const SpatialReadinessSchema = z.object({
  hasSpatialMap: z.boolean(),
  scanId: z.string().nullable(),
  source: SpatialMapSourceSchema.nullable(),
  createdAt: z.string().datetime().nullable(),
});
export type SpatialReadiness = z.infer<typeof SpatialReadinessSchema>;

/**
 * GET /api/resident/home — FROZEN v1.
 * Sumber: prompts/docs/prd.md §6.1, architecture.md §10.2.
 *
 * Menggantikan pemakaian ResidentProfile sebagai response endpoint. Home wajib
 * memuat last drill dan spatial readiness; sebelumnya keduanya tidak ada pada
 * contract dan Domain 1 tidak dapat merender PRD §6.1 tanpa menghitung sendiri.
 */
export const ResidentHomeResponseSchema = ResidentProfileSchema.extend({
  lastDrill: LastDrillSummarySchema.nullable(),
  spatialReadiness: SpatialReadinessSchema,
});
export type ResidentHomeResponse = z.infer<typeof ResidentHomeResponseSchema>;

/** Satu reward yang sudah diterbitkan server (tabel reward_issuances). */
export const RewardIssuanceSchema = z.object({
  issuanceId: z.string(),
  drillId: z.string(),
  cycleStartedAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
});
export type RewardIssuance = z.infer<typeof RewardIssuanceSchema>;

/**
 * GET /api/resident/rewards — FROZEN v1.
 * Eligibility dihitung server-side dari rolling tujuh hari. Client tidak boleh
 * menghitung ulang berdasarkan minggu lokal.
 */
export const ResidentRewardsResponseSchema = z.object({
  eligibility: RewardEligibilitySchema,
  issuances: z.array(RewardIssuanceSchema),
});
export type ResidentRewardsResponse = z.infer<typeof ResidentRewardsResponseSchema>;

export const DrillHistoryItemSchema = z.object({
  drillId: z.string(),
  scanId: z.string(),
  reactionTimeMs: z.number().int().min(0),
  evacuationTimeMs: z.number().int().min(0),
  postureScorePercentage: z.number().min(0).max(100),
  safetyRating: z.number().min(0).max(100),
  tier: TierSchema,
  rewardEligible: z.boolean(),
  completedAt: z.string().datetime(),
});
export type DrillHistoryItem = z.infer<typeof DrillHistoryItemSchema>;

/**
 * GET /api/resident/history?installationId=&limit=&cursor= — FROZEN v1.
 * Cursor bersifat opaque; nextCursor null berarti akhir data.
 * Urutan dibekukan: completedAt DESC. Client tidak boleh mengurutkan ulang.
 */
export const ResidentHistoryResponseSchema = z.object({
  items: z.array(DrillHistoryItemSchema),
  nextCursor: z.string().nullable(),
});
export type ResidentHistoryResponse = z.infer<typeof ResidentHistoryResponseSchema>;
