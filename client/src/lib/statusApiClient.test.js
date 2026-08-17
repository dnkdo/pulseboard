import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchStatusSnapshot } from './statusApiClient.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchFor(routes) {
  global.fetch = vi.fn((url) => {
    const route = routes[url];
    if (!route) {
      throw new Error(`unexpected fetch to ${url}`);
    }
    return Promise.resolve(route);
  });
}

describe('fetchStatusSnapshot', () => {
  it('fetches incidents and components concurrently and combines them into one snapshot', async () => {
    mockFetchFor({
      '/api/incidents': { ok: true, json: async () => [{ id: '1', status: 'open' }] },
      '/api/components': {
        ok: true,
        json: async () => [{ id: 'api', healthState: 'operational' }],
      },
    });

    await expect(fetchStatusSnapshot()).resolves.toEqual({
      incidents: [{ id: '1', status: 'open', resolvedAt: null }],
      components: [{ id: 'api', healthState: 'operational' }],
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/incidents');
    expect(global.fetch).toHaveBeenCalledWith('/api/components');
  });

  it('rejects when the incidents endpoint returns a non-2xx response, even if components succeeds', async () => {
    mockFetchFor({
      '/api/incidents': { ok: false, status: 500 },
      '/api/components': { ok: true, json: async () => [] },
    });

    await expect(fetchStatusSnapshot()).rejects.toThrow('500');
  });

  it('rejects when the components endpoint returns a non-2xx response, even if incidents succeeds', async () => {
    mockFetchFor({
      '/api/incidents': { ok: true, json: async () => [] },
      '/api/components': { ok: false, status: 503 },
    });

    await expect(fetchStatusSnapshot()).rejects.toThrow('503');
  });
});
