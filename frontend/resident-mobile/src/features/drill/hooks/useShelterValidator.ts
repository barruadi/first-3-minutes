import { useEffect, useRef } from 'react';
import {
  SHELTER_VALIDATION_MS,
  GYRO_VARIANCE_THRESHOLD,
  LUX_DARKNESS_THRESHOLD,
} from '../types';

interface ShelterValidatorParams {
  running: boolean;
  isLightSensorAvailable: boolean;
  lux: number | null;
  gyroVariance: number;
  onCandidateStart: () => void;
  onCandidateBreak: () => void;
  onValidated: () => void;
}

// Polls every 100ms. Calls callbacks to drive the state machine.
// Darkness: lux < 10 (or any if sensor unavailable — gyro-only mode for iOS).
// Stability: gyroVariance < 0.05 on rolling 1s window.
// Both conditions must hold for SHELTER_VALIDATION_MS (3000ms) continuously.
export function useShelterValidator({
  running,
  isLightSensorAvailable,
  lux,
  gyroVariance,
  onCandidateStart,
  onCandidateBreak,
  onValidated,
}: ShelterValidatorParams): void {
  const paramsRef = useRef({
    isLightSensorAvailable,
    lux,
    gyroVariance,
    onCandidateStart,
    onCandidateBreak,
    onValidated,
  });
  paramsRef.current = { isLightSensorAvailable, lux, gyroVariance, onCandidateStart, onCandidateBreak, onValidated };

  const candidateStartRef = useRef<number | null>(null);
  const validatedRef = useRef(false);

  useEffect(() => {
    if (!running) {
      candidateStartRef.current = null;
      validatedRef.current = false;
      return;
    }

    const id = setInterval(() => {
      if (validatedRef.current) return;
      const p = paramsRef.current;

      const isDark = !p.isLightSensorAvailable
        ? true // gyro-only mode: skip light check
        : p.lux !== null && p.lux < LUX_DARKNESS_THRESHOLD;

      const isStable =
        isFinite(p.gyroVariance) && p.gyroVariance < GYRO_VARIANCE_THRESHOLD;

      const conditionMet = isDark && isStable;

      if (conditionMet) {
        if (candidateStartRef.current === null) {
          candidateStartRef.current = Date.now();
          p.onCandidateStart();
        } else if (Date.now() - candidateStartRef.current >= SHELTER_VALIDATION_MS) {
          validatedRef.current = true;
          p.onValidated();
        }
      } else {
        if (candidateStartRef.current !== null) {
          candidateStartRef.current = null;
          p.onCandidateBreak();
        }
      }
    }, 100);

    return () => {
      clearInterval(id);
    };
  }, [running]);
}

// Pure helper: returns remaining ms to validation (for display).
export function shelterRemainingMs(candidateStartedAt: number | null): number {
  if (candidateStartedAt === null) return SHELTER_VALIDATION_MS;
  return Math.max(0, SHELTER_VALIDATION_MS - (Date.now() - candidateStartedAt));
}
