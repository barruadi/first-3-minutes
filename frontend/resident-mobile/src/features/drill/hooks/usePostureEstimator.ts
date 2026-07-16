import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';
import type { AccelReading } from '../sensors/types';
import type { PostureStatus } from '../types';
import { POSTURE_POLL_MS } from '../types';

// Estimates posture from accelerometer y-axis uprightness.
// expo-sensors Accelerometer returns normalized values where magnitude ≈ 1G.
// y ≈ -1.0 → device upright (user standing) → TOO_HIGH
// y ≈ 0    → device horizontal (user crouched under table) → LOW
// In between → UNKNOWN
export function estimatePosture(acc: AccelReading): PostureStatus {
  const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
  if (magnitude < 0.5) return 'UNKNOWN'; // no gravity signal
  const uprightness = Math.abs(acc.y) / magnitude;
  if (uprightness > 0.75) return 'TOO_HIGH';
  if (uprightness < 0.45) return 'LOW';
  return 'UNKNOWN';
}

interface UsePostureEstimatorResult {
  posture: PostureStatus;
  samplesTotal: number;
  samplesLow: number;
  postureScorePercentage: number;
}

export function usePostureEstimator(running: boolean): UsePostureEstimatorResult {
  const [posture, setPosture] = useState<PostureStatus>('UNKNOWN');
  const samplesTotalRef = useRef(0);
  const samplesLowRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) {
      setPosture('UNKNOWN');
      samplesTotalRef.current = 0;
      samplesLowRef.current = 0;
      return;
    }

    Accelerometer.setUpdateInterval(POSTURE_POLL_MS);
    const sub = Accelerometer.addListener((data) => {
      const reading: AccelReading = { ...data, timestamp: Date.now() };
      const status = estimatePosture(reading);
      setPosture(status);

      if (status !== 'UNKNOWN') {
        samplesTotalRef.current += 1;
        if (status === 'LOW') samplesLowRef.current += 1;
        setTick((t) => t + 1);
      }
    });

    return () => sub.remove();
  }, [running]);

  const postureScorePercentage =
    samplesTotalRef.current > 0
      ? Math.round((samplesLowRef.current / samplesTotalRef.current) * 100)
      : 0;

  return {
    posture,
    samplesTotal: samplesTotalRef.current,
    samplesLow: samplesLowRef.current,
    postureScorePercentage,
  };
}
