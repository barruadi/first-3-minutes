import type { FloorPlanMeta } from '../../store/scanStore';

// The iOS LiDAR renderer and Guest WebAR canvas both use this source size.
export const FLOOR_PLAN_SOURCE_SIZE = 512;

export interface Point2D {
  x: number;
  y: number;
}

export interface WorldPoint {
  posX: number;
  posZ: number;
}

/** Convert a tap on the scaled mobile image into floor-plan world coordinates. */
export function displayPointToWorld(
  point: Point2D,
  displaySize: number,
  meta: FloorPlanMeta,
): WorldPoint {
  const sourceX = (point.x / displaySize) * FLOOR_PLAN_SOURCE_SIZE;
  const sourceY = (point.y / displaySize) * FLOOR_PLAN_SOURCE_SIZE;
  return {
    posX: meta.originX + sourceX * meta.scaleMetersPerPixel,
    posZ: meta.originZ + (FLOOR_PLAN_SOURCE_SIZE - sourceY) * meta.scaleMetersPerPixel,
  };
}

/** Convert stored world coordinates back to the scaled mobile image position. */
export function worldToDisplayPoint(
  point: WorldPoint,
  displaySize: number,
  meta: FloorPlanMeta,
): Point2D {
  const sourceX = (point.posX - meta.originX) / meta.scaleMetersPerPixel;
  const sourceY = FLOOR_PLAN_SOURCE_SIZE - (point.posZ - meta.originZ) / meta.scaleMetersPerPixel;
  return {
    x: Math.max(0, Math.min(displaySize, (sourceX / FLOOR_PLAN_SOURCE_SIZE) * displaySize)),
    y: Math.max(0, Math.min(displaySize, (sourceY / FLOOR_PLAN_SOURCE_SIZE) * displaySize)),
  };
}
