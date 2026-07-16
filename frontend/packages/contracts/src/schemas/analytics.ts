import { z } from 'zod';

export const SafetyMatrixCellSchema = z.object({
  locationRef: z.string(),
  failureRatePercentage: z.number().min(0).max(100),
  averageEvacuationTimeMs: z.number().int().min(0),
  sampleCount: z.number().int().min(0),
});
export type SafetyMatrixCell = z.infer<typeof SafetyMatrixCellSchema>;

export const AnalyticsSummarySchema = z.object({
  buildingId: z.string(),
  participationRatePercentage: z.number().min(0).max(100),
  averageShelterTimeMs: z.number().int().min(0),
  escapeRouteTrends: z.array(
    z.object({
      period: z.string(),
      averageEvacuationTimeMs: z.number().int().min(0),
    })
  ),
  heatmapCells: z.array(SafetyMatrixCellSchema),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
