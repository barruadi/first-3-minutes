import { useEffect, useRef, useState, useCallback } from 'react';

interface UseMonotonicCountdownResult {
  remainingMs: number;
  reset: () => void;
}

// Countdown based on Date.now() deltas — never drifts due to interval jitter.
// `onExpire` is called once when remaining reaches 0.
export function useMonotonicCountdown(
  durationMs: number,
  running: boolean,
  onExpire: () => void,
): UseMonotonicCountdownResult {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!startTimeRef.current) return;
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, durationMs - elapsed);
    setRemainingMs(remaining);

    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current();
      return;
    }

    if (remaining > 0) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [durationMs]);

  useEffect(() => {
    if (!running) {
      cancel();
      startTimeRef.current = null;
      expiredRef.current = false;
      setRemainingMs(durationMs);
      return;
    }

    startTimeRef.current = Date.now();
    expiredRef.current = false;
    rafRef.current = requestAnimationFrame(tick);

    return cancel;
  }, [running, durationMs, tick, cancel]);

  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    expiredRef.current = false;
    setRemainingMs(durationMs);
    cancel();
    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs, tick, cancel]);

  return { remainingMs, reset };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatCountdownMs(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
