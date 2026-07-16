import type { GyroReading } from './types';

// Returns the mean per-axis variance over a rolling time window.
// Returns Infinity when fewer than 2 samples are in the window (insufficient data).
export function computeRollingVariance(
  readings: GyroReading[],
  windowMs: number,
  nowMs: number,
): number {
  const inWindow = readings.filter((r) => nowMs - r.timestamp <= windowMs);
  if (inWindow.length < 2) return Infinity;

  const axes = ['x', 'y', 'z'] as const;
  let total = 0;

  for (const axis of axes) {
    const values = inWindow.map((r) => r[axis]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    total += variance;
  }

  return total / 3;
}

// Maintains a rolling buffer, evicting samples older than maxAgeMs.
export class GyroBuffer {
  private readings: GyroReading[] = [];
  private readonly maxAgeMs: number;

  constructor(maxAgeMs: number) {
    this.maxAgeMs = maxAgeMs;
  }

  push(reading: GyroReading): void {
    this.readings.push(reading);
    const cutoff = reading.timestamp - this.maxAgeMs;
    // Keep only recent samples
    this.readings = this.readings.filter((r) => r.timestamp >= cutoff);
  }

  variance(nowMs: number): number {
    return computeRollingVariance(this.readings, this.maxAgeMs, nowMs);
  }

  clear(): void {
    this.readings = [];
  }

  get length(): number {
    return this.readings.length;
  }
}
