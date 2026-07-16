import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SpatialMapSchema,
  DrillMetricsSchema,
  GuestRouteSchema,
  AnalyticsSummarySchema,
} from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, '../../fixtures');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf-8'));
}

describe('SpatialMap contract', () => {
  it('parses valid fixture', () => {
    const data = loadFixture('spatial-map.valid.json');
    const result = SpatialMapSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid fixture', () => {
    const data = loadFixture('spatial-map.invalid.json');
    const result = SpatialMapSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('DrillMetrics contract', () => {
  it('parses valid fixture', () => {
    const data = loadFixture('drill-metrics.valid.json');
    const result = DrillMetricsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid fixture', () => {
    const data = loadFixture('drill-metrics.invalid.json');
    const result = DrillMetricsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('GuestRoute contract', () => {
  it('parses valid fixture', () => {
    const data = loadFixture('guest-route.valid.json');
    const result = GuestRouteSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('AnalyticsSummary contract', () => {
  it('parses valid fixture', () => {
    const data = loadFixture('analytics-summary.valid.json');
    const result = AnalyticsSummarySchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
