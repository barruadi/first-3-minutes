import type { SpatialObject, Coordinate3D } from '@3minutes/contracts';
import { distance2D } from './SpatialCoordinateAdapter';

// Returns the nearest safe zone to `from`, using stable tie-break by id.
// Returns null when the list is empty — callers must treat this as an error state.
export function selectNearestSafeZone(
  zones: SpatialObject[],
  from: Coordinate3D = { x: 0, y: 0, z: 0 },
): SpatialObject | null {
  if (zones.length === 0) return null;

  return zones.reduce<SpatialObject>((best, zone) => {
    const dZone = distance2D(zone.position, from);
    const dBest = distance2D(best.position, from);
    if (dZone < dBest) return zone;
    if (dZone === dBest) return zone.id < best.id ? zone : best; // stable tie-break
    return best;
  }, zones[0]!);
}

// Returns the nearest exit point to `from`, using stable tie-break by id.
// Returns null when the list is empty.
export function selectNearestExitPoint(
  exits: SpatialObject[],
  from: Coordinate3D = { x: 0, y: 0, z: 0 },
): SpatialObject | null {
  if (exits.length === 0) return null;

  return exits.reduce<SpatialObject>((best, exit) => {
    const dExit = distance2D(exit.position, from);
    const dBest = distance2D(best.position, from);
    if (dExit < dBest) return exit;
    if (dExit === dBest) return exit.id < best.id ? exit : best;
    return best;
  }, exits[0]!);
}

// Returns true when the map has at least one safe zone and one exit point.
export function isMapSufficient(
  safeZones: SpatialObject[],
  exitPoints: SpatialObject[],
): boolean {
  return safeZones.length >= 1 && exitPoints.length >= 1;
}
