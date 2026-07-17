export const MARK_NAV_START = 'dashboard_nav_start';
export const MARK_READY = 'dashboard_ready';
export const MEASURE_READY = 'dashboard_ready_duration';

export const DASHBOARD_BUDGET_MS = 2000;

let alreadyMarked = false;

export function markDashboardReady(): number | null {
  if (alreadyMarked) return null;
  if (typeof performance === 'undefined') return null;
  if (!performance.getEntriesByName(MARK_NAV_START).length) return null;

  alreadyMarked = true;
  performance.mark(MARK_READY);
  performance.measure(MEASURE_READY, MARK_NAV_START, MARK_READY);

  const entry = performance.getEntriesByName(MEASURE_READY).at(-1);
  const duration = entry?.duration ?? null;

  if (duration !== null && import.meta.env.DEV) {
    const verdict = duration <= DASHBOARD_BUDGET_MS ? 'OK' : 'MELEBIHI BUDGET';
    console.info(
      `[perf] dashboard_ready ${duration.toFixed(0)}ms (budget ${DASHBOARD_BUDGET_MS}ms) — ${verdict}`
    );
  }

  return duration;
}

export function resetDashboardMarks(): void {
  alreadyMarked = false;
  if (typeof performance === 'undefined') return;
  performance.clearMarks(MARK_NAV_START);
  performance.clearMarks(MARK_READY);
  performance.clearMeasures(MEASURE_READY);
}

export function getDashboardReadyMs(): number | null {
  if (typeof performance === 'undefined') return null;
  return performance.getEntriesByName(MEASURE_READY).at(-1)?.duration ?? null;
}
