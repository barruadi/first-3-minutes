import { z } from 'zod';

export const SafetyMatrixCellSchema = z.object({
  locationRef: z.string(),
  failureRatePercentage: z.number().min(0).max(100),
  averageEvacuationTimeMs: z.number().int().min(0),
  sampleCount: z.number().int().min(0),
});
export type SafetyMatrixCell = z.infer<typeof SafetyMatrixCellSchema>;

/**
 * Satu titik pada Escape Route Trends.
 * `period` memakai format ISO week: YYYY-Www (contoh: "2026-W29").
 */
export const EscapeRouteTrendPointSchema = z.object({
  period: z.string().regex(/^\d{4}-W\d{2}$/, 'period harus berformat ISO week YYYY-Www'),
  averageEvacuationTimeMs: z.number().int().min(0),
});
export type EscapeRouteTrendPoint = z.infer<typeof EscapeRouteTrendPointSchema>;

/**
 * GET /api/admin/analytics — FROZEN v1.
 * Sumber: architecture.md §8.6.
 *
 * buildingId pada response bersifat informatif (server mengisinya dari
 * DEMO_BUILDING_ID). Domain 4 TIDAK mengirim buildingId pada request.
 * Seluruh agregasi dihitung Domain 3; portal hanya memformat.
 */
export const AnalyticsSummarySchema = z.object({
  buildingId: z.string(),
  participationRatePercentage: z.number().min(0).max(100),
  averageShelterTimeMs: z.number().int().min(0),
  escapeRouteTrends: z.array(EscapeRouteTrendPointSchema),
  heatmapCells: z.array(SafetyMatrixCellSchema),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
