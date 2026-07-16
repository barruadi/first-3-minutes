import { z } from 'zod';
import { TierSchema } from './common.js';

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

/**
 * Kesiapan spatial sebagai status string, mengikuti implementasi Domain 3.
 * Nilai berasal dari status scan terbaru: 'needs_scan' bila belum ada scan,
 * 'ready' bila scan completed/fallback, atau status scan mentah
 * (uploaded|processing|failed) selama pemrosesan.
 *
 * Divalidasi longgar sebagai string agar status baru dari server tidak
 * membuat client crash; gunakan SPATIAL_READINESS_READY untuk branching.
 */
export const SpatialReadinessSchema = z.string();
export type SpatialReadiness = z.infer<typeof SpatialReadinessSchema>;

export const SPATIAL_READINESS_NEEDS_SCAN = 'needs_scan';
export const SPATIAL_READINESS_READY = 'ready';

/** Satu entri riwayat drill. Dipakai juga sebagai ringkasan lastDrill pada Home. */
export const DrillHistoryItemSchema = z.object({
  drillId: z.string(),
  scanId: z.string(),
  reactionTimeMs: z.number().int().min(0),
  evacuationTimeMs: z.number().int().min(0),
  postureScorePercentage: z.number().min(0).max(100),
  safetyRating: z.number().min(0).max(100),
  tier: TierSchema,
  rewardEligible: z.boolean(),
  createdAt: z.string().datetime(),
});
export type DrillHistoryItem = z.infer<typeof DrillHistoryItemSchema>;

/**
 * GET /api/resident/home — FROZEN v1.
 * Sumber: prompts/docs/prd.md §6.1, architecture.md §10.2.
 *
 * Menggantikan pemakaian ResidentProfile sebagai response endpoint. Home wajib
 * memuat last drill dan spatial readiness; sebelumnya keduanya tidak ada pada
 * contract dan Domain 1 tidak dapat merender PRD §6.1 tanpa menghitung sendiri.
 */
export const ResidentHomeResponseSchema = ResidentProfileSchema.extend({
  lastDrill: DrillHistoryItemSchema.nullable(),
  spatialReadiness: SpatialReadinessSchema,
});
export type ResidentHomeResponse = z.infer<typeof ResidentHomeResponseSchema>;

/** Satu reward yang sudah diterbitkan server, termasuk kode kupon demo. */
export const RewardRecordSchema = z.object({
  id: z.string(),
  drillId: z.string(),
  issuedAt: z.string().datetime(),
  couponCode: z.string(),
});
export type RewardRecord = z.infer<typeof RewardRecordSchema>;

/**
 * GET /api/resident/rewards.
 * Eligibility dihitung server-side dari rolling tujuh hari. Client tidak boleh
 * menghitung ulang berdasarkan minggu lokal.
 */
export const ResidentRewardsResponseSchema = z.object({
  installationId: z.string(),
  eligibility: RewardEligibilitySchema,
  tier: TierSchema,
  records: z.array(RewardRecordSchema),
});
export type ResidentRewardsResponse = z.infer<typeof ResidentRewardsResponseSchema>;

/**
 * GET /api/resident/history?installationId=&limit=&cursor= — FROZEN v1.
 * Cursor bersifat opaque; nextCursor null berarti akhir data.
 * Urutan dibekukan: createdAt DESC. Client tidak boleh mengurutkan ulang.
 */
export const ResidentHistoryResponseSchema = z.object({
  items: z.array(DrillHistoryItemSchema),
  nextCursor: z.string().nullable(),
});
export type ResidentHistoryResponse = z.infer<typeof ResidentHistoryResponseSchema>;
