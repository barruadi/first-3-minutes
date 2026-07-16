import {
  toArrowAngleRad,
  distance2D,
  distance3D,
  angleToDirection,
  flattenToFloor,
} from '../ar/SpatialCoordinateAdapter';

const ORIGIN = { x: 0, y: 0, z: 0 };

describe('toArrowAngleRad', () => {
  it('returns 0 for a target straight ahead (negative Z)', () => {
    const angle = toArrowAngleRad({ x: 0, y: 0, z: -5 }, ORIGIN);
    expect(angle).toBeCloseTo(0);
  });

  it('returns PI/2 for a target to the right (positive X)', () => {
    const angle = toArrowAngleRad({ x: 5, y: 0, z: 0 }, ORIGIN);
    expect(angle).toBeCloseTo(Math.PI / 2);
  });

  it('returns -PI/2 for a target to the left (negative X)', () => {
    const angle = toArrowAngleRad({ x: -5, y: 0, z: 0 }, ORIGIN);
    expect(angle).toBeCloseTo(-Math.PI / 2);
  });

  it('ignores Y axis (floor-plane computation)', () => {
    const a1 = toArrowAngleRad({ x: 1, y: 0, z: -1 }, ORIGIN);
    const a2 = toArrowAngleRad({ x: 1, y: 10, z: -1 }, ORIGIN);
    expect(a1).toBeCloseTo(a2);
  });

  it('uses custom origin', () => {
    const angle = toArrowAngleRad({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 });
    expect(angle).toBeCloseTo(0); // target is ahead (negative Z relative to origin)
  });
});

describe('distance2D', () => {
  it('computes XZ-plane distance only', () => {
    expect(distance2D({ x: 3, y: 0, z: 4 }, ORIGIN)).toBeCloseTo(5);
    expect(distance2D({ x: 3, y: 999, z: 4 }, ORIGIN)).toBeCloseTo(5); // Y ignored
  });

  it('returns 0 for same point', () => {
    expect(distance2D(ORIGIN, ORIGIN)).toBeCloseTo(0);
  });
});

describe('distance3D', () => {
  it('computes 3D Euclidean distance', () => {
    expect(distance3D({ x: 1, y: 2, z: 2 }, ORIGIN)).toBeCloseTo(3);
  });
});

describe('angleToDirection', () => {
  it('maps 0 rad to straight', () => {
    expect(angleToDirection(0)).toBe('straight');
  });

  it('maps PI/2 to right', () => {
    expect(angleToDirection(Math.PI / 2)).toBe('right');
  });

  it('maps -PI/2 to left', () => {
    expect(angleToDirection(-Math.PI / 2)).toBe('left');
  });

  it('maps PI to behind', () => {
    expect(angleToDirection(Math.PI)).toBe('behind');
  });
});

describe('flattenToFloor', () => {
  it('sets y to 0', () => {
    const result = flattenToFloor({ x: 1.5, y: 10, z: -3 });
    expect(result).toEqual({ x: 1.5, y: 0, z: -3 });
  });
});
