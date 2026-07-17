import { useEffect, useRef } from 'react';
import type { Coordinate3D } from '@3minutes/contracts';

const STEP_RISE_MPS2   = 12.5; // m/s² total-magnitude threshold entering a peak
const STEP_FALL_MPS2   = 10.5; // m/s² threshold exiting peak (hysteresis)
const STEP_LENGTH_M    = 0.70; // metres credited per detected stride
const STEP_DEBOUNCE_MS = 350;  // minimum ms between counted steps (~2.8 steps/sec max)

/**
 * Dead-reckons walking position from the QR-scan origin using DeviceMotion
 * magnitude-peak step detection.
 *
 * Coordinate convention matches Three.js world / route coords:
 *   compass heading 0° (North) → moves along -Z
 *   compass heading 90° (East) → moves along +X
 *
 * Returns a stable MutableRefObject — safe to read inside a rAF loop without
 * stale-closure risk. Falls back silently when DeviceMotion is unavailable.
 */
export function useStepTracking(
  headingRef: React.MutableRefObject<number>
): React.MutableRefObject<Coordinate3D> {
  const positionRef = useRef<Coordinate3D>({ x: 0, y: 0, z: 0 });
  const inPeak      = useRef(false);
  const lastStepMs  = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let listener: ((e: DeviceMotionEvent) => void) | null = null;

    void (async () => {
      // iOS 13+ requires explicit DeviceMotion permission.
      const anyDME = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof anyDME.requestPermission === 'function') {
        try {
          const state = await anyDME.requestPermission();
          if (cancelled || state !== 'granted') return;
        } catch {
          return;
        }
      }
      if (cancelled) return;

      listener = (e: DeviceMotionEvent) => {
        const g = e.accelerationIncludingGravity;
        if (!g) return;
        const mag = Math.sqrt((g.x ?? 0) ** 2 + (g.y ?? 0) ** 2 + (g.z ?? 0) ** 2);
        const now = performance.now();

        if (!inPeak.current && mag >= STEP_RISE_MPS2) {
          inPeak.current = true;
        } else if (inPeak.current && mag <= STEP_FALL_MPS2) {
          inPeak.current = false;
          if (now - lastStepMs.current < STEP_DEBOUNCE_MS) return;
          lastStepMs.current = now;

          const rad = (headingRef.current * Math.PI) / 180;
          positionRef.current = {
            x: positionRef.current.x + Math.sin(rad) * STEP_LENGTH_M,
            y: 0,
            z: positionRef.current.z - Math.cos(rad) * STEP_LENGTH_M,
          };
        }
      };

      window.addEventListener('devicemotion', listener);
    })();

    return () => {
      cancelled = true;
      if (listener) window.removeEventListener('devicemotion', listener);
    };
  }, [headingRef]);

  return positionRef;
}
