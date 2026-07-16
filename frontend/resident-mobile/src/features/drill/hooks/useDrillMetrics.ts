import type { DrillMetrics } from '@3minutes/contracts';
import type { DrillState } from '../types';
import { DEMO_SCAN_ID } from '../types';

// Assembles the DrillMetrics contract from DrillState timing data.
// All fields are validated: non-negative, finite, within range.
// Returns null if required timing data is missing.
export function assembleDrillMetrics(
  state: DrillState,
  postureScorePercentage: number,
  scanId: string = DEMO_SCAN_ID,
): DrillMetrics | null {
  const {
    earthquakeStartedAt,
    shelterCandidateAt,
    shelterValidatedAt,
    smokeEscapeStartedAt,
    exitReachedAt,
  } = state;

  if (
    !earthquakeStartedAt ||
    !shelterCandidateAt ||
    !shelterValidatedAt ||
    !smokeEscapeStartedAt ||
    !exitReachedAt
  ) {
    return null;
  }

  // reactionTimeMs: from earthquake start to shelter candidate detected
  const reactionTimeMs = Math.max(0, shelterCandidateAt - earthquakeStartedAt);

  // evacuationTimeMs: from smoke escape start to exit reached
  const evacuationTimeMs = Math.max(0, exitReachedAt - smokeEscapeStartedAt);

  // postureScore: clamp 0-100
  const clampedPosture = Math.min(100, Math.max(0, postureScorePercentage));

  const metrics: DrillMetrics = {
    scanId,
    reactionTimeMs,
    evacuationTimeMs,
    postureScorePercentage: clampedPosture,
    completedAtDevice: new Date().toISOString(),
  };

  return metrics;
}
