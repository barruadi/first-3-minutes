import { z } from 'zod';
import { Coordinate3DSchema } from './common.js';

export const BuildingSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  organizationId: z.string(),
  createdAt: z.string().datetime(),
});
export type Building = z.infer<typeof BuildingSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  floorPlanId: z.string().nullable(),
  locationRef: z.string(),
  label: z.string(),
  origin: Coordinate3DSchema,
  routePoints: z.array(Coordinate3DSchema),
  exitPoint: Coordinate3DSchema,
  createdAt: z.string().datetime(),
});
export type Location = z.infer<typeof LocationSchema>;

/** GET /api/admin/locations mengembalikan array. */
export const LocationListSchema = z.array(LocationSchema);
export type LocationList = z.infer<typeof LocationListSchema>;

export const QrProvisionResponseSchema = z.object({
  locationId: z.string(),
  guestUrl: z.string().url(),
  qrSvgUrl: z.string(),
  qrPngUrl: z.string(),
});
export type QrProvisionResponse = z.infer<typeof QrProvisionResponseSchema>;

export const GuestRouteSchema = z.object({
  locationRef: z.string(),
  origin: Coordinate3DSchema,
  routePoints: z.array(Coordinate3DSchema),
  hazardPoints: z.array(Coordinate3DSchema),
  safeZones: z.array(Coordinate3DSchema),
  exitPoint: Coordinate3DSchema,
});
export type GuestRoute = z.infer<typeof GuestRouteSchema>;

/** Floor plan yang diunggah Admin (architecture.md §12.9). */
export const FloorPlanSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  name: z.string(),
  fileUrl: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type FloorPlan = z.infer<typeof FloorPlanSchema>;

/** GET /api/admin/floor-plans mengembalikan array. */
export const FloorPlanListSchema = z.array(FloorPlanSchema);
export type FloorPlanList = z.infer<typeof FloorPlanListSchema>;

/**
 * POST /api/admin/compliance-reports — FROZEN v1.
 *
 * TIDAK memuat buildingId. Server SELALU memakai DEMO_BUILDING_ID dari
 * settings dan mengabaikan scope building dari client (architecture.md §10.6,
 * §11). Field buildingId dihapus pada freeze v1 karena contract sebelumnya
 * memaksa Domain 4 mengirim field yang wajib ditolak Domain 3.
 */
export const ComplianceReportRequestSchema = z.object({
  periodFrom: z.string().datetime(),
  periodTo: z.string().datetime(),
});
export type ComplianceReportRequest = z.infer<typeof ComplianceReportRequestSchema>;

export const ComplianceReportStatusSchema = z.enum([
  'pending',
  'ready',
  'failed',
]);
export type ComplianceReportStatus = z.infer<typeof ComplianceReportStatusSchema>;

export const ComplianceReportResponseSchema = z.object({
  reportId: z.string(),
  status: ComplianceReportStatusSchema,
  /** Tersedia hanya ketika status='ready'. */
  downloadUrl: z.string().nullable(),
});
export type ComplianceReportResponse = z.infer<typeof ComplianceReportResponseSchema>;
