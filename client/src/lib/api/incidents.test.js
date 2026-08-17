import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchIncidents } from './incidents.js';

describe('fetchIncidents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests /api/incidents and preserves an already-present status/resolvedAt', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', title: 'API Down', status: 'active', severity: 'SEV1', resolvedAt: '2026-08-01T00:00:00Z' },
      ],
    });

    await expect(fetchIncidents()).resolves.toEqual([
      { id: '1', title: 'API Down', status: 'active', severity: 'SEV1', resolvedAt: '2026-08-01T00:00:00Z' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith('/api/incidents');
  });

  it('throws with the status code when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchIncidents()).rejects.toThrow('500');
  });

  it('maps the server-shaped `state` field to `status` when `status` is absent', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'DB Outage', state: 'investigating', severity: 'SEV1' }],
    });

    const [incident] = await fetchIncidents();
    expect(incident.status).toBe('investigating');
  });

  it('derives resolvedAt from the last resolved entry in stateHistory when resolvedAt is absent', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: '1',
          title: 'Session TTL bug',
          state: 'resolved',
          severity: 'SEV2',
          stateHistory: [
            { state: 'open', timestamp: '2026-08-01T00:00:00Z' },
            { state: 'investigating', timestamp: '2026-08-01T01:00:00Z' },
            { state: 'resolved', timestamp: '2026-08-01T02:00:00Z' },
          ],
        },
      ],
    });

    const [incident] = await fetchIncidents();
    expect(incident.status).toBe('resolved');
    expect(incident.resolvedAt).toBe('2026-08-01T02:00:00Z');
  });

  it('falls back to a null resolvedAt when there is no resolved entry to derive it from', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'Still open', state: 'open', severity: 'SEV3', stateHistory: [] }],
    });

    const [incident] = await fetchIncidents();
    expect(incident.resolvedAt).toBeNull();
  });
});
