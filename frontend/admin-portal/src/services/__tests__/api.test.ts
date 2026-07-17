import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi, AdminApiError } from '../api.js';

afterEach(() => { vi.restoreAllMocks(); });

describe('admin API demo scope', () => {
  it('never sends a client building scope for analytics', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      buildingId: 'demo-building',
      participationRatePercentage: 72,
      averageShelterTimeMs: 3200,
      escapeRouteTrends: [],
      heatmapCells: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await adminApi.getAnalytics();

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/admin\/analytics$/);
    expect(String(url)).not.toContain('building');
    expect(options?.headers).toBeUndefined();
  });

  it('rejects backend contract drift at the network boundary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(adminApi.getLocations()).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('creates compliance reports without buildingId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      reportId: 'report-1', status: 'ready',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));

    await adminApi.createComplianceReport({
      periodFrom: '2026-07-01T00:00:00.000Z',
      periodTo: '2026-07-16T23:59:59.000Z',
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    expect(body).not.toHaveProperty('buildingId');
  });
});
