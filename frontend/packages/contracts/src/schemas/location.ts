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

export const ComplianceReportRequestSchema = z.object({
  buildingId: z.string(),
  periodFrom: z.string().datetime(),
  periodTo: z.string().datetime(),
});
export type ComplianceReportRequest = z.infer<typeof ComplianceReportRequestSchema>;
