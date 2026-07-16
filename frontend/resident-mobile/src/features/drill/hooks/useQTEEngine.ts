import { useCallback, useEffect, useRef, useState } from 'react';
import { QTE_REQUIRED_TAPS, QTE_WINDOW_MS } from '../types';

export type QTEStatus = 'idle' | 'active' | 'success' | 'failed';

export interface QTEState {
  status: QTEStatus;
  tapCount: number;
  windowRemainingMs: number;
}

interface UseQTEEngineResult {
  state: QTEState;
  activate: () => void;
  recordTap: () => void;
  reset: () => void;
}

// QTE engine: 5 taps within a 2-second window.
// activate() → starts the window (records activatedAt).
// recordTap() → increments counter; success on 5th tap within window.
// If window expires before 5 taps → status = 'failed', then resets to 'idle'.
export function useQTEEngine(
  onSuccess: () => void,
  onTimeout: () => void,
): UseQTEEngineResult {
  const [status, setStatus] = useState<QTEStatus>('idle');
  const [tapCount, setTapCount] = useState(0);
  const [windowRemainingMs, setWindowRemainingMs] = useState(QTE_WINDOW_MS);

  const activatedAtRef = useRef<number | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onTimeoutRef = useRef(onTimeout);
  onSuccessRef.current = onSuccess;
  onTimeoutRef.current = onTimeout;

  const tapCountRef = useRef(0);
  const statusRef = useRef<QTEStatus>('idle');

  const activate = useCallback(() => {
    activatedAtRef.current = Date.now();
    tapCountRef.current = 0;
    statusRef.current = 'active';
    setStatus('active');
    setTapCount(0);
    setWindowRemainingMs(QTE_WINDOW_MS);
  }, []);

  const reset = useCallback(() => {
    activatedAtRef.current = null;
    tapCountRef.current = 0;
    statusRef.current = 'idle';
    setStatus('idle');
    setTapCount(0);
    setWindowRemainingMs(QTE_WINDOW_MS);
  }, []);

  const recordTap = useCallback(() => {
    if (statusRef.current !== 'active') return;
    const now = Date.now();
    const activatedAt = activatedAtRef.current;
    if (!activatedAt) return;

    if (now - activatedAt > QTE_WINDOW_MS) return; // outside window, ignore

    const newCount = tapCountRef.current + 1;
    tapCountRef.current = newCount;
    setTapCount(newCount);

    if (newCount >= QTE_REQUIRED_TAPS) {
      statusRef.current = 'success';
      setStatus('success');
      activatedAtRef.current = null;
      onSuccessRef.current();
    }
  }, []);

  // Poll window countdown
  useEffect(() => {
    if (status !== 'active') return;

    const id = setInterval(() => {
      const activatedAt = activatedAtRef.current;
      if (!activatedAt) return;

      const elapsed = Date.now() - activatedAt;
      const remaining = Math.max(0, QTE_WINDOW_MS - elapsed);
      setWindowRemainingMs(remaining);

      if (remaining === 0 && statusRef.current === 'active') {
        statusRef.current = 'failed';
        setStatus('failed');
        activatedAtRef.current = null;
        // Brief failed state, then reset
        setTimeout(() => {
          statusRef.current = 'idle';
          setStatus('idle');
          setTapCount(0);
          tapCountRef.current = 0;
          setWindowRemainingMs(QTE_WINDOW_MS);
          onTimeoutRef.current();
        }, 800);
      }
    }, 50);

    return () => clearInterval(id);
  }, [status]);

  return {
    state: { status, tapCount, windowRemainingMs },
    activate,
    recordTap,
    reset,
  };
}
