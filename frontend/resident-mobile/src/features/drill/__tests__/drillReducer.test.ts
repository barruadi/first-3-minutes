import { drillReducer, INITIAL_DRILL_STATE } from '../types';
import type { DrillState } from '../types';

const T = 1000;

function applyActions(actions: Parameters<typeof drillReducer>[1][]): DrillState {
  return actions.reduce<DrillState>((s, a) => drillReducer(s, a), INITIAL_DRILL_STATE);
}

describe('drillReducer', () => {
  describe('START', () => {
    it('transitions ready → earthquake', () => {
      const s = drillReducer(INITIAL_DRILL_STATE, { type: 'START', at: T });
      expect(s.phase).toBe('earthquake');
      expect(s.drillStartedAt).toBe(T);
      expect(s.earthquakeStartedAt).toBe(T);
    });

    it('ignores START when not in ready phase', () => {
      const mid = drillReducer(INITIAL_DRILL_STATE, { type: 'START', at: T });
      const same = drillReducer(mid, { type: 'START', at: T + 1 });
      expect(same.phase).toBe('earthquake');
      expect(same.drillStartedAt).toBe(T); // unchanged
    });
  });

  describe('SHELTER_CANDIDATE_START', () => {
    it('transitions earthquake → shelter_candidate', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 1000 },
      ]);
      expect(s.phase).toBe('shelter_candidate');
      expect(s.shelterCandidateAt).toBe(T + 1000);
    });
  });

  describe('SHELTER_CANDIDATE_BREAK', () => {
    it('transitions shelter_candidate → earthquake', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
        { type: 'SHELTER_CANDIDATE_BREAK', at: T + 1500 },
      ]);
      expect(s.phase).toBe('earthquake');
      expect(s.shelterCandidateAt).toBeNull();
    });
  });

  describe('SHELTER_VALIDATED → SMOKE_PHASE_BEGIN', () => {
    it('transitions shelter_candidate → shelter_validated → smoke_escape', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
        { type: 'SHELTER_VALIDATED', at: T + 3500 },
        { type: 'SMOKE_PHASE_BEGIN', at: T + 5000 },
      ]);
      expect(s.phase).toBe('smoke_escape');
      expect(s.shelterValidatedAt).toBe(T + 3500);
      expect(s.smokeEscapeStartedAt).toBe(T + 5000);
    });
  });

  describe('COUNTDOWN_EXPIRED', () => {
    it('transitions earthquake → failure', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'COUNTDOWN_EXPIRED', at: T + 30000 },
      ]);
      expect(s.phase).toBe('failure');
      expect(s.failureReason).toBe('countdown_expired');
    });

    it('transitions shelter_candidate → failure', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 25000 },
        { type: 'COUNTDOWN_EXPIRED', at: T + 30000 },
      ]);
      expect(s.phase).toBe('failure');
    });
  });

  describe('QTE flow', () => {
    it('smoke_escape → qte_active → smoke_escape on success', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
        { type: 'SHELTER_VALIDATED', at: T + 3500 },
        { type: 'SMOKE_PHASE_BEGIN', at: T + 5000 },
        { type: 'QTE_TRIGGER', at: T + 6000 },
        { type: 'QTE_SUCCESS', at: T + 7000 },
      ]);
      expect(s.phase).toBe('smoke_escape');
    });

    it('qte_active → smoke_escape on timeout', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
        { type: 'SHELTER_VALIDATED', at: T + 3500 },
        { type: 'SMOKE_PHASE_BEGIN', at: T + 5000 },
        { type: 'QTE_TRIGGER', at: T + 6000 },
        { type: 'QTE_TIMEOUT', at: T + 8000 },
      ]);
      expect(s.phase).toBe('smoke_escape');
    });
  });

  describe('EXIT_REACHED', () => {
    it('transitions smoke_escape → completed', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
        { type: 'SHELTER_VALIDATED', at: T + 3500 },
        { type: 'SMOKE_PHASE_BEGIN', at: T + 5000 },
        { type: 'EXIT_REACHED', at: T + 20000 },
      ]);
      expect(s.phase).toBe('completed');
      expect(s.exitReachedAt).toBe(T + 20000);
    });
  });

  describe('POSTURE transitions', () => {
    it('smoke_escape → posture_warning → smoke_escape', () => {
      const s = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
        { type: 'SHELTER_VALIDATED', at: T + 3500 },
        { type: 'SMOKE_PHASE_BEGIN', at: T + 5000 },
        { type: 'POSTURE_TOO_HIGH', at: T + 7000 },
        { type: 'POSTURE_OK', at: T + 7100 },
      ]);
      expect(s.phase).toBe('smoke_escape');
      expect(s.postureViolationCount).toBe(1);
    });
  });

  describe('RESET', () => {
    it('resets to initial state from any phase', () => {
      const mid = applyActions([
        { type: 'START', at: T },
        { type: 'SHELTER_CANDIDATE_START', at: T + 500 },
      ]);
      const reset = drillReducer(mid, { type: 'RESET' });
      expect(reset.phase).toBe('ready');
      expect(reset.drillStartedAt).toBeNull();
    });
  });
});
