import { computeRollingVariance, GyroBuffer } from '../sensors/GyroRollingVariance';
import type { GyroReading } from '../sensors/types';

const NOW = 10_000;

function makeReading(x: number, y: number, z: number, offsetMs = 0): GyroReading {
  return { x, y, z, timestamp: NOW - offsetMs };
}

describe('computeRollingVariance', () => {
  it('returns Infinity when fewer than 2 samples', () => {
    expect(computeRollingVariance([], 1000, NOW)).toBe(Infinity);
    expect(computeRollingVariance([makeReading(0, 0, 0)], 1000, NOW)).toBe(Infinity);
  });

  it('returns 0 for identical readings', () => {
    const readings = [
      makeReading(1, 2, 3, 100),
      makeReading(1, 2, 3, 200),
      makeReading(1, 2, 3, 300),
    ];
    expect(computeRollingVariance(readings, 1000, NOW)).toBeCloseTo(0);
  });

  it('returns non-zero for varying readings', () => {
    const readings = [
      makeReading(0, 0, 0, 100),
      makeReading(1, 1, 1, 200),
      makeReading(-1, -1, -1, 300),
    ];
    const variance = computeRollingVariance(readings, 1000, NOW);
    expect(variance).toBeGreaterThan(0);
  });

  it('excludes samples outside the window', () => {
    const readings = [
      makeReading(10, 10, 10, 2000), // too old (outside 1000ms window)
      makeReading(0, 0, 0, 100),
      makeReading(0, 0, 0, 200),
    ];
    // Only the two zeros are in-window → variance ≈ 0
    expect(computeRollingVariance(readings, 1000, NOW)).toBeCloseTo(0);
  });

  it('stable signal (variance < 0.05 threshold) for tiny noise', () => {
    const readings = [
      makeReading(0.01, -0.01, 0.01, 100),
      makeReading(-0.01, 0.01, -0.01, 200),
      makeReading(0.02, -0.02, 0.02, 300),
      makeReading(-0.02, 0.02, -0.02, 400),
    ];
    const variance = computeRollingVariance(readings, 1000, NOW);
    expect(variance).toBeLessThan(0.05);
  });
});

describe('GyroBuffer', () => {
  it('evicts old samples', () => {
    const buf = new GyroBuffer(1000);
    buf.push({ x: 1, y: 1, z: 1, timestamp: 0 });
    buf.push({ x: 0, y: 0, z: 0, timestamp: 2000 }); // 2s later
    // The first reading is more than 1000ms before the second
    // Buffer should only keep samples within maxAgeMs of the newest
    expect(buf.length).toBe(1);
  });

  it('clears all samples', () => {
    const buf = new GyroBuffer(1000);
    buf.push({ x: 0, y: 0, z: 0, timestamp: NOW });
    buf.push({ x: 1, y: 1, z: 1, timestamp: NOW - 100 });
    buf.clear();
    expect(buf.length).toBe(0);
    expect(buf.variance(NOW)).toBe(Infinity);
  });
});
