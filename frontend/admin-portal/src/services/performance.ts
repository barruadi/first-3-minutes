/**
 * Pengukuran dashboard_ready — acceptance PRD §8.2: initial render lengkap
 * maksimal dua detik pada kondisi demo.
 *
 * `dashboard_ready` didefinisikan (03-coder/domain-4) sebagai saat SELURUH
 * widget wajib sudah settled: KPI, participation, shelter metric, route trend,
 * dan heat-map (atau empty state eksplisit). Menandai saat fetch selesai akan
 * mengukur hal yang salah — render belum tentu commit.
 */

export const MARK_NAV_START = 'dashboard_nav_start';
export const MARK_READY = 'dashboard_ready';
export const MEASURE_READY = 'dashboard_ready_duration';

export const DASHBOARD_BUDGET_MS = 2000;

let alreadyMarked = false;

/** Dipanggil setelah commit DOM widget wajib. Idempotent per sesi halaman. */
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
    // Bukti performance untuk QA; hanya pada development.
    console.info(
      `[perf] dashboard_ready ${duration.toFixed(0)}ms (budget ${DASHBOARD_BUDGET_MS}ms) — ${verdict}`
    );
  }

  return duration;
}

/** Untuk test dan navigasi ulang. */
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
