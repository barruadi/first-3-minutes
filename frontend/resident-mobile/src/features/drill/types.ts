import type { DrillCompletionResponse } from '@3minutes/contracts';

export type DrillPhase =
  | 'ready'
  | 'earthquake'
  | 'shelter_candidate'
  | 'shelter_validated'
  | 'smoke_escape'
  | 'posture_warning'
  | 'qte_active'
  | 'completed'
  | 'submitting'
  | 'result'
  | 'failure';

export type FailureReason =
  | 'countdown_expired'
  | 'sensor_unavailable'
  | 'app_backgrounded'
  | 'internal_error';

export type AccessibilityMode = 'VISUAL_ONLY' | 'VISUAL_AND_AUDIO' | 'AUDIO_PRIMARY';

export type PostureStatus = 'LOW' | 'TOO_HIGH' | 'UNKNOWN';

export type GuidanceAction =
  | 'GO_STRAIGHT'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'AVOID_LEFT'
  | 'AVOID_RIGHT'
  | 'STAY_LOW'
  | 'SAFE_ZONE_LEFT'
  | 'SAFE_ZONE_RIGHT'
  | 'EXIT_AHEAD'
  | 'ARRIVED';

export interface GuidanceEvent {
  action: GuidanceAction;
  distanceMeters?: number;
  priority: 'NORMAL' | 'CRITICAL';
}

export interface SensorCapability {
  lightSensor: boolean;
  gyroscope: boolean;
  accelerometer: boolean;
}

export type DrillAction =
  | { type: 'START'; at: number }
  | { type: 'RESET' }
  | { type: 'SHELTER_CANDIDATE_START'; at: number }
  | { type: 'SHELTER_CANDIDATE_BREAK'; at: number }
  | { type: 'SHELTER_VALIDATED'; at: number }
  | { type: 'SMOKE_PHASE_BEGIN'; at: number }
  | { type: 'COUNTDOWN_EXPIRED'; at: number }
  | { type: 'POSTURE_TOO_HIGH'; at: number }
  | { type: 'POSTURE_OK'; at: number }
  | { type: 'QTE_TRIGGER'; at: number }
  | { type: 'QTE_SUCCESS'; at: number }
  | { type: 'QTE_TIMEOUT'; at: number }
  | { type: 'EXIT_REACHED'; at: number }
  | { type: 'SUBMIT_START'; at: number }
  | { type: 'SUBMIT_COMPLETE'; result: DrillCompletionResponse; at: number }
  | { type: 'SUBMIT_ERROR'; at: number }
  | { type: 'FAILURE'; reason: FailureReason; at: number };

export interface DrillState {
  phase: DrillPhase;
  failureReason: FailureReason | null;
  drillStartedAt: number | null;
  earthquakeStartedAt: number | null;
  shelterCandidateAt: number | null;
  shelterValidatedAt: number | null;
  smokeEscapeStartedAt: number | null;
  exitReachedAt: number | null;
  postureViolationCount: number;
  postureSamplesTotal: number;
  postureSamplesLow: number;
  result: DrillCompletionResponse | null;
}

export const INITIAL_DRILL_STATE: DrillState = {
  phase: 'ready',
  failureReason: null,
  drillStartedAt: null,
  earthquakeStartedAt: null,
  shelterCandidateAt: null,
  shelterValidatedAt: null,
  smokeEscapeStartedAt: null,
  exitReachedAt: null,
  postureViolationCount: 0,
  postureSamplesTotal: 0,
  postureSamplesLow: 0,
  result: null,
};

export function drillReducer(state: DrillState, action: DrillAction): DrillState {
  switch (action.type) {
    case 'RESET':
      return { ...INITIAL_DRILL_STATE };

    case 'START':
      if (state.phase !== 'ready') return state;
      return {
        ...INITIAL_DRILL_STATE,
        phase: 'earthquake',
        drillStartedAt: action.at,
        earthquakeStartedAt: action.at,
      };

    case 'SHELTER_CANDIDATE_START':
      if (state.phase !== 'earthquake') return state;
      return { ...state, phase: 'shelter_candidate', shelterCandidateAt: action.at };

    case 'SHELTER_CANDIDATE_BREAK':
      if (state.phase !== 'shelter_candidate') return state;
      return { ...state, phase: 'earthquake', shelterCandidateAt: null };

    case 'SHELTER_VALIDATED':
      if (state.phase !== 'shelter_candidate') return state;
      return { ...state, phase: 'shelter_validated', shelterValidatedAt: action.at };

    case 'SMOKE_PHASE_BEGIN':
      if (state.phase !== 'shelter_validated') return state;
      return { ...state, phase: 'smoke_escape', smokeEscapeStartedAt: action.at };

    case 'COUNTDOWN_EXPIRED':
      if (state.phase !== 'earthquake' && state.phase !== 'shelter_candidate') return state;
      return { ...state, phase: 'failure', failureReason: 'countdown_expired' };

    case 'POSTURE_TOO_HIGH':
      if (state.phase !== 'smoke_escape') return state;
      return { ...state, phase: 'posture_warning', postureViolationCount: state.postureViolationCount + 1 };

    case 'POSTURE_OK':
      if (state.phase !== 'posture_warning') return state;
      return { ...state, phase: 'smoke_escape' };

    case 'QTE_TRIGGER':
      if (state.phase !== 'smoke_escape') return state;
      return { ...state, phase: 'qte_active' };

    case 'QTE_SUCCESS':
      if (state.phase !== 'qte_active') return state;
      return { ...state, phase: 'smoke_escape' };

    case 'QTE_TIMEOUT':
      if (state.phase !== 'qte_active') return state;
      return { ...state, phase: 'smoke_escape' };

    case 'EXIT_REACHED':
      if (state.phase !== 'smoke_escape' && state.phase !== 'posture_warning') return state;
      return { ...state, phase: 'completed', exitReachedAt: action.at };

    case 'SUBMIT_START':
      if (state.phase !== 'completed') return state;
      return { ...state, phase: 'submitting' };

    case 'SUBMIT_COMPLETE':
      if (state.phase !== 'submitting') return state;
      return { ...state, phase: 'result', result: action.result };

    case 'SUBMIT_ERROR':
      if (state.phase !== 'submitting') return state;
      return { ...state, phase: 'result' };

    case 'FAILURE':
      return { ...state, phase: 'failure', failureReason: action.reason };

    default:
      return state;
  }
}

export const DEMO_SCAN_ID = 'scan-demo-001';
export const DEMO_INSTALLATION_ID = 'resident-demo-001';
export const EARTHQUAKE_COUNTDOWN_MS = 30_000;
export const SHELTER_VALIDATION_MS = 3_000;
export const QTE_WINDOW_MS = 2_000;
export const QTE_REQUIRED_TAPS = 5;
export const POSTURE_POLL_MS = 100;
export const GYRO_VARIANCE_THRESHOLD = 0.05;
export const LUX_DARKNESS_THRESHOLD = 10;
export const GYRO_WINDOW_MS = 1_000;
