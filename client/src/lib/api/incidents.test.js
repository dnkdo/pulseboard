import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchIncidents } from './incidents.js';

describe('fetchIncidents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests /api/incidents and returns the parsed JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'API Down', status: 'active', severity: 'SEV1' }],
    });

    await expect(fetchIncidents()).resolves.toEqual([
      { id: '1', title: 'API Down', status: 'active', severity: 'SEV1' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith('/api/incidents');
  });

  it('throws with the status code when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchIncidents()).rejects.toThrow('500');
  });
});
