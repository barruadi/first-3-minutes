import {
  selectNearestSafeZone,
  selectNearestExitPoint,
  isMapSufficient,
} from '../ar/SafeZoneSelector';
import type { SpatialObject } from '@3minutes/contracts';

const makeZone = (id: string, x: number, z: number): SpatialObject => ({
  id,
  type: 'SAFE_ZONE',
  label: id,
  position: { x, y: 0, z },
  confidence: 0.9,
});

describe('selectNearestSafeZone', () => {
  it('returns null for empty list', () => {
    expect(selectNearestSafeZone([])).toBeNull();
  });

  it('returns the single zone when only one exists', () => {
    const zone = makeZone('a', 2, -2);
    expect(selectNearestSafeZone([zone])).toBe(zone);
  });

  it('selects the zone nearest to origin', () => {
    const far = makeZone('far', 10, 10);
    const near = makeZone('near', 1, 1);
    expect(selectNearestSafeZone([far, near])).toBe(near);
  });

  it('uses stable id tie-break for equidistant zones', () => {
    const a = makeZone('a', 1, 0);
    const b = makeZone('b', -1, 0);
    // Both are distance=1 from origin; 'a' < 'b' alphabetically → 'a' wins
    expect(selectNearestSafeZone([b, a])?.id).toBe('a');
  });

  it('respects custom origin', () => {
    const zone1 = makeZone('z1', 0, 0);
    const zone2 = makeZone('z2', 5, 5);
    // From (4,0,4), zone2 is nearer
    expect(selectNearestSafeZone([zone1, zone2], { x: 4, y: 0, z: 4 })).toBe(zone2);
  });
});

describe('isMapSufficient', () => {
  const exit: SpatialObject = { id: 'e', type: 'EXIT_POINT', label: 'door', position: { x: 0, y: 0, z: -5 } };
  const safe: SpatialObject = { id: 's', type: 'SAFE_ZONE', label: 'table', position: { x: 1, y: 0, z: -2 } };

  it('returns true when both lists are non-empty', () => {
    expect(isMapSufficient([safe], [exit])).toBe(true);
  });

  it('returns false when safe zones are empty', () => {
    expect(isMapSufficient([], [exit])).toBe(false);
  });

  it('returns false when exit points are empty', () => {
    expect(isMapSufficient([safe], [])).toBe(false);
  });

  it('returns false when both are empty', () => {
    expect(isMapSufficient([], [])).toBe(false);
  });
});
