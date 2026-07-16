import { useReducer, useCallback, useEffect, useRef } from 'react';
import { Gyroscope, LightSensor } from 'expo-sensors';
import { drillReducer, INITIAL_DRILL_STATE, EARTHQUAKE_COUNTDOWN_MS, GYRO_WINDOW_MS } from '../types';
import type { DrillState, DrillAction, FailureReason, SensorCapability } from '../types';
import { useMonotonicCountdown } from './useMonotonicCountdown';
import { useShelterValidator } from './useShelterValidator';
import { usePostureEstimator } from './usePostureEstimator';
import { useQTEEngine } from './useQTEEngine';
import { GyroBuffer } from '../sensors/GyroRollingVariance';
import type { DrillMetrics, DrillCompletionResponse } from '@3minutes/contracts';
import { assembleDrillMetrics } from './useDrillMetrics';
import { residentApi } from '../../../services/apiClient';

interface UseDrillStateMachineResult {
  state: DrillState;
  capability: SensorCapability;
  qteState: ReturnType<typeof useQTEEngine>['state'];
  countdownRemainingMs: number;
  currentLux: number | null;
  currentVariance: number;
  posture: import('../types').PostureStatus;
  postureScorePercentage: number;
  start: () => void;
  triggerQTE: () => void;
  recordQTETap: () => void;
  confirmExitReached: () => void;
  abort: (reason?: FailureReason) => void;
  reset: () => void;
}

const DEMO_DRILL_ID = 'drill-demo-001';

export function useDrillStateMachine(
  scanId: string,
  installationId: string,
): UseDrillStateMachineResult {
  const [state, dispatch] = useReducer(drillReducer, INITIAL_DRILL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [capability, setCapability] = useReducer(
    (_: SensorCapability, next: SensorCapability) => next,
    { lightSensor: false, gyroscope: true, accelerometer: true },
  );

  // Probe sensor availability once on mount
  useEffect(() => {
    void (async () => {
      const light = await LightSensor.isAvailableAsync().catch(() => false);
      setCapability({ lightSensor: light, gyroscope: true, accelerometer: true });
    })();
  }, []);

  // Gyroscope rolling variance
  const gyroBufferRef = useRef(new GyroBuffer(GYRO_WINDOW_MS));
  const [currentVariance, setVariance] = useReducer((_: number, v: number) => v, Infinity);

  useEffect(() => {
    const isActive = (s: DrillState) =>
      s.phase === 'earthquake' || s.phase === 'shelter_candidate';
    if (!isActive(stateRef.current)) return;

    Gyroscope.setUpdateInterval(100);
    const sub = Gyroscope.addListener((data) => {
      gyroBufferRef.current.push({ ...data, timestamp: Date.now() });
      setVariance(gyroBufferRef.current.variance(Date.now()));
    });
    return () => {
      sub.remove();
      gyroBufferRef.current.clear();
    };
  }, [state.phase]);

  // Light sensor
  const [currentLux, setLux] = useReducer((_: number | null, v: number | null) => v, null);

  useEffect(() => {
    const isActive = (s: DrillState) =>
      s.phase === 'earthquake' || s.phase === 'shelter_candidate';
    if (!capability.lightSensor || !isActive(stateRef.current)) return;

    const sub = LightSensor.addListener((d) => setLux(d.illuminance));
    return () => sub.remove();
  }, [capability.lightSensor, state.phase]);

  // Posture estimator — active during smoke phases
  const isSmokePhase =
    state.phase === 'smoke_escape' || state.phase === 'posture_warning' || state.phase === 'qte_active';
  const { posture, postureScorePercentage } = usePostureEstimator(isSmokePhase);

  // Drive posture state transitions
  useEffect(() => {
    if (state.phase === 'smoke_escape' && posture === 'TOO_HIGH') {
      dispatch({ type: 'POSTURE_TOO_HIGH', at: Date.now() });
    }
    if (state.phase === 'posture_warning' && posture === 'LOW') {
      dispatch({ type: 'POSTURE_OK', at: Date.now() });
    }
  }, [posture, state.phase]);

  // Earthquake countdown
  const isCountdownRunning = state.phase === 'earthquake' || state.phase === 'shelter_candidate';
  const { remainingMs: countdownRemainingMs } = useMonotonicCountdown(
    EARTHQUAKE_COUNTDOWN_MS,
    isCountdownRunning,
    useCallback(() => {
      dispatch({ type: 'COUNTDOWN_EXPIRED', at: Date.now() });
    }, []),
  );

  // Shelter validator
  useShelterValidator({
    running: isCountdownRunning,
    isLightSensorAvailable: capability.lightSensor,
    lux: currentLux,
    gyroVariance: currentVariance,
    onCandidateStart: useCallback(() => {
      dispatch({ type: 'SHELTER_CANDIDATE_START', at: Date.now() });
    }, []),
    onCandidateBreak: useCallback(() => {
      dispatch({ type: 'SHELTER_CANDIDATE_BREAK', at: Date.now() });
    }, []),
    onValidated: useCallback(() => {
      dispatch({ type: 'SHELTER_VALIDATED', at: Date.now() });
    }, []),
  });

  // Transition shelter_validated → smoke_escape after brief celebration pause
  useEffect(() => {
    if (state.phase !== 'shelter_validated') return;
    const id = setTimeout(() => {
      dispatch({ type: 'SMOKE_PHASE_BEGIN', at: Date.now() });
    }, 1500);
    return () => clearTimeout(id);
  }, [state.phase]);

  // Handle submitting
  useEffect(() => {
    if (state.phase !== 'completed') return;

    const submit = async () => {
      dispatch({ type: 'SUBMIT_START', at: Date.now() });
      const metrics = assembleDrillMetrics(state, postureScorePercentage, scanId);
      if (!metrics) {
        dispatch({ type: 'SUBMIT_ERROR', at: Date.now() });
        return;
      }
      try {
        const result = await residentApi.completeDrill(DEMO_DRILL_ID, metrics);
        dispatch({ type: 'SUBMIT_COMPLETE', result, at: Date.now() });
      } catch {
        dispatch({ type: 'SUBMIT_ERROR', at: Date.now() });
      }
    };

    const id = setTimeout(() => {
      void submit();
    }, 500);

    return () => clearTimeout(id);
  }, [state.phase, scanId, postureScorePercentage]);

  // QTE engine
  const { state: qteState, activate: activateQTE, recordTap, reset: resetQTE } = useQTEEngine(
    useCallback(() => dispatch({ type: 'QTE_SUCCESS', at: Date.now() }), []),
    useCallback(() => dispatch({ type: 'QTE_TIMEOUT', at: Date.now() }), []),
  );

  const start = useCallback(() => {
    dispatch({ type: 'START', at: Date.now() });
  }, []);

  const triggerQTE = useCallback(() => {
    dispatch({ type: 'QTE_TRIGGER', at: Date.now() });
    activateQTE();
  }, [activateQTE]);

  const confirmExitReached = useCallback(() => {
    dispatch({ type: 'EXIT_REACHED', at: Date.now() });
  }, []);

  const abort = useCallback((reason: FailureReason = 'internal_error') => {
    dispatch({ type: 'FAILURE', reason, at: Date.now() });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    capability,
    qteState,
    countdownRemainingMs,
    currentLux,
    currentVariance,
    posture,
    postureScorePercentage,
    start,
    triggerQTE,
    recordQTETap: recordTap,
    confirmExitReached,
    abort,
    reset,
  };
}
