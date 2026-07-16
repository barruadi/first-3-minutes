import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SpatialMapSchema,
  isDrillReady,
  DrillMetricsSchema,
  DrillCompletionResponseSchema,
  DrillOutcomeSchema,
  GuestRouteSchema,
  AnalyticsSummarySchema,
  ApiErrorSchema,
  ErrorCodeSchema,
  GuidanceEventSchema,
  AccessibilityModeSchema,
  ResidentHomeResponseSchema,
  ComplianceReportRequestSchema,
} from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, '../../fixtures');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf-8'));
}

describe('SpatialMap contract', () => {
  it('parses valid fixture', () => {
    expect(SpatialMapSchema.safeParse(loadFixture('spatial-map.valid.json')).success).toBe(true);
  });

  it('parses fallback fixture with source=fallback', () => {
    const result = SpatialMapSchema.safeParse(loadFixture('spatial-map.fallback.json'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.source).toBe('fallback');
  });

  it('rejects invalid fixture', () => {
    expect(SpatialMapSchema.safeParse(loadFixture('spatial-map.invalid.json')).success).toBe(false);
  });

  // Minimum safe/exit adalah kesiapan drill, bukan validitas wire.
  it('still parses a map with no safe zone, matching the backend schema', () => {
    const result = SpatialMapSchema.safeParse(loadFixture('spatial-map.no-safe-zone.invalid.json'));
    expect(result.success).toBe(true);
  });

  it('reports a map with no safe zone as not drill-ready', () => {
    const map = SpatialMapSchema.parse(loadFixture('spatial-map.no-safe-zone.invalid.json'));
    expect(isDrillReady(map)).toBe(false);
  });

  it('reports a complete map as drill-ready', () => {
    const map = SpatialMapSchema.parse(loadFixture('spatial-map.valid.json'));
    expect(isDrillReady(map)).toBe(true);
  });
});

describe('DrillMetrics contract', () => {
  it('parses valid fixture', () => {
    expect(DrillMetricsSchema.safeParse(loadFixture('drill-metrics.valid.json')).success).toBe(true);
  });

  it('rejects invalid fixture', () => {
    expect(DrillMetricsSchema.safeParse(loadFixture('drill-metrics.invalid.json')).success).toBe(false);
  });
});

describe('DrillCompletionResponse contract', () => {
  it('parses eligible fixture', () => {
    const result = DrillCompletionResponseSchema.safeParse(loadFixture('drill-result.eligible.json'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rewardEligible).toBe(true);
  });

  it('parses not-eligible fixture', () => {
    const result = DrillCompletionResponseSchema.safeParse(loadFixture('drill-result.not-eligible.json'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rewardEligible).toBe(false);
  });

  it('rejects a tier outside the frozen enum', () => {
    const base = loadFixture('drill-result.eligible.json');
    expect(DrillCompletionResponseSchema.safeParse({ ...base, tier: 'Bronze' }).success).toBe(false);
  });
});

describe('DrillOutcome contract (Domain 1 <-> Domain 2)', () => {
  it('accepts a success outcome carrying metrics', () => {
    const outcome = { status: 'success', metrics: loadFixture('drill-metrics.valid.json') };
    expect(DrillOutcomeSchema.safeParse(outcome).success).toBe(true);
  });

  it('accepts a failure outcome with a frozen reason', () => {
    expect(DrillOutcomeSchema.safeParse({ status: 'failure', failureReason: 'TIMER_EXPIRED' }).success).toBe(true);
  });

  it('rejects a success outcome without metrics', () => {
    expect(DrillOutcomeSchema.safeParse({ status: 'success' }).success).toBe(false);
  });

  it('rejects an unfrozen failure reason', () => {
    expect(DrillOutcomeSchema.safeParse({ status: 'failure', failureReason: 'GAVE_UP' }).success).toBe(false);
  });
});

describe('Accessibility contract (ACC-001)', () => {
  it('parses the guidance event fixture', () => {
    expect(GuidanceEventSchema.safeParse(loadFixture('guidance-event.valid.json')).success).toBe(true);
  });

  it('accepts a guidance event without a distance', () => {
    expect(GuidanceEventSchema.safeParse({ action: 'ARRIVED', priority: 'CRITICAL' }).success).toBe(true);
  });

  it('rejects an action outside the frozen set', () => {
    expect(GuidanceEventSchema.safeParse({ action: 'FOLLOW_GREEN_ARROW', priority: 'NORMAL' }).success).toBe(false);
  });

  it('freezes the three accessibility modes', () => {
    expect(AccessibilityModeSchema.options).toEqual(['VISUAL_ONLY', 'VISUAL_AND_AUDIO', 'AUDIO_PRIMARY']);
  });
});

describe('ResidentHome contract', () => {
  it('parses valid fixture including lastDrill and spatialReadiness', () => {
    const result = ResidentHomeResponseSchema.safeParse(loadFixture('resident-home.valid.json'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lastDrill).not.toBeNull();
      expect(result.data.spatialReadiness).toBe('ready');
    }
  });

  it('accepts a first-run resident with no drill and no map', () => {
    const result = ResidentHomeResponseSchema.safeParse({
      installationId: 'resident-demo-002',
      safetyRating: { score: 0, tier: 'Silver', lastDrillAt: null },
      rewardEligibility: { eligible: true, nextEligibleAt: null, lastIssuedAt: null },
      locationStatus: null,
      lastDrill: null,
      spatialReadiness: 'needs_scan',
    });
    expect(result.success).toBe(true);
  });
});

describe('GuestRoute contract', () => {
  it('parses valid fixture', () => {
    expect(GuestRouteSchema.safeParse(loadFixture('guest-route.valid.json')).success).toBe(true);
  });
});

describe('AnalyticsSummary contract', () => {
  it('parses valid fixture', () => {
    expect(AnalyticsSummarySchema.safeParse(loadFixture('analytics-summary.valid.json')).success).toBe(true);
  });

  it('rejects a trend period that is not an ISO week', () => {
    const base = loadFixture('analytics-summary.valid.json');
    const broken = { ...base, escapeRouteTrends: [{ period: 'July', averageEvacuationTimeMs: 1000 }] };
    expect(AnalyticsSummarySchema.safeParse(broken).success).toBe(false);
  });
});

describe('ComplianceReportRequest contract', () => {
  it('parses valid fixture', () => {
    expect(ComplianceReportRequestSchema.safeParse(loadFixture('compliance-report-request.valid.json')).success).toBe(true);
  });

  // architecture.md §10.6 / §11: server selalu memakai DEMO_BUILDING_ID.
  it('strips buildingId rather than carrying client building scope', () => {
    const result = ComplianceReportRequestSchema.safeParse({
      buildingId: 'building-attacker-001',
      periodFrom: '2026-07-01T00:00:00Z',
      periodTo: '2026-07-16T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('buildingId');
  });
});

describe('ApiError contract', () => {
  it('parses the timeout fixture', () => {
    const result = ApiErrorSchema.safeParse(loadFixture('error.timeout.json'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.error.code).toBe('SPATIAL_AI_TIMEOUT');
  });

  it('parses the invalid-token fixture', () => {
    const result = ApiErrorSchema.safeParse(loadFixture('error.invalid-token.json'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.error.code).toBe('QR_TOKEN_INVALID');
  });

  it('keeps both fixture codes inside the frozen code list', () => {
    for (const fixture of ['error.timeout.json', 'error.invalid-token.json']) {
      const { error } = loadFixture(fixture);
      expect(ErrorCodeSchema.safeParse(error.code).success).toBe(true);
    }
  });
});
