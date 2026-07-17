export const MARK_LANDING = 'guest_landing';
export const MARK_OPERATIONAL = 'guest_scene_operational';
export const MEASURE_STARTUP = 'guest_startup_duration';

export const STARTUP_BUDGET_MS = 3000;
export const FPS_TARGET = 60;

let marked = false;

export function markSceneOperational(): number | null {
  if (marked || typeof performance === 'undefined') return null;
  if (!performance.getEntriesByName(MARK_LANDING).length) return null;

  marked = true;
  performance.mark(MARK_OPERATIONAL);
  performance.measure(MEASURE_STARTUP, MARK_LANDING, MARK_OPERATIONAL);
  const duration = performance.getEntriesByName(MEASURE_STARTUP).at(-1)?.duration ?? null;

  if (duration !== null && import.meta.env.DEV) {
    const verdict = duration <= STARTUP_BUDGET_MS ? 'OK' : 'MELEBIHI BUDGET';
    console.info(
      `[perf] guest_operational ${duration.toFixed(0)}ms (budget ${STARTUP_BUDGET_MS}ms) — ${verdict}`
    );
  }
  return duration;
}

export function resetStartupMarks(): void {
  marked = false;
  if (typeof performance === 'undefined') return;
  performance.clearMarks(MARK_LANDING);
  performance.clearMarks(MARK_OPERATIONAL);
  performance.clearMeasures(MEASURE_STARTUP);
}

export class FpsSampler {
  private readonly deltas: Float32Array;
  private index = 0;
  private count = 0;
  private lastMs: number | null = null;

  constructor(capacity = 240) {
    this.deltas = new Float32Array(capacity);
  }

  tick(nowMs: number): void {
    if (this.lastMs !== null) {
      this.deltas[this.index] = nowMs - this.lastMs;
      this.index = (this.index + 1) % this.deltas.length;
      if (this.count < this.deltas.length) this.count++;
    }
    this.lastMs = nowMs;
  }

  /** @returns average dan p95 FPS, atau null bila sampel belum cukup. */
  report(): { averageFps: number; p95FrameMs: number; samples: number } | null {
    if (this.count < 10) return null;
    const slice = Array.from(this.deltas.subarray(0, this.count)).sort((a, b) => a - b);
    const mean = slice.reduce((s, d) => s + d, 0) / slice.length;
    const p95 = slice[Math.min(slice.length - 1, Math.floor(slice.length * 0.95))]!;
    return {
      averageFps: mean > 0 ? 1000 / mean : 0,
      p95FrameMs: p95,
      samples: this.count,
    };
  }

  reset(): void {
    this.index = 0;
    this.count = 0;
    this.lastMs = null;
  }
}
