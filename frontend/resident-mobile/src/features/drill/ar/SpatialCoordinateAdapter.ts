import type { Coordinate3D } from '@3minutes/contracts';

// Backend convention: x=right+, y=up+, z=depth (negative = forward from origin).
// AR overlay: XZ floor plane projected to 2D compass angle.
// Angle 0 = straight ahead (-Z direction), positive = clockwise (right).

export function toArrowAngleRad(
  target: Coordinate3D,
  origin: Coordinate3D = { x: 0, y: 0, z: 0 },
): number {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  // atan2(dx, -dz): 0 when straight ahead (dz<0), PI/2 when right
  return Math.atan2(dx, -dz);
}

export function distance2D(a: Coordinate3D, b: Coordinate3D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

export function distance3D(a: Coordinate3D, b: Coordinate3D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

// Convert radians to compass direction label.
export function angleToDirection(rad: number): 'straight' | 'left' | 'right' | 'behind' {
  const deg = ((rad * 180) / Math.PI + 360) % 360;
  if (deg <= 22.5 || deg > 337.5) return 'straight';
  if (deg > 22.5 && deg <= 157.5) return 'right';
  if (deg > 157.5 && deg <= 202.5) return 'behind';
  return 'left';
}

// Normalize a backend Coordinate3D to a flat-floor (y=0) position.
export function flattenToFloor(c: Coordinate3D): Coordinate3D {
  return { x: c.x, y: 0, z: c.z };
}
