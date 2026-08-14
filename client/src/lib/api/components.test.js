import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchComponents } from './components.js';

describe('fetchComponents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests /api/components and returns the parsed JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'api', name: 'API', healthState: 'operational', uptimePercent: 99.95 }],
    });

    await expect(fetchComponents()).resolves.toEqual([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 99.95 },
    ]);
    expect(global.fetch).toHaveBeenCalledWith('/api/components');
  });

  it('throws with the status code when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchComponents()).rejects.toThrow('500');
  });
});
