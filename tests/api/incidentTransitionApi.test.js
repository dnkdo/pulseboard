import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { postIncidentTransition } from '../../src/api/incidentTransitionApi.js';
import { ApiError } from '../../src/api/httpClient.js';

function jsonResponse(body, { status = 200, ok = true } = {}) {
  return {
    status,
    ok,
    json: () => Promise.resolve(body),
  };
}

describe('postIncidentTransition', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PATCHes /incidents/:id with the requested next state', async () => {
    const updated = { id: 'inc-1', state: 'investigating' };
    fetch.mockResolvedValueOnce(jsonResponse(updated));

    const result = await postIncidentTransition('inc-1', 'investigating');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/inc-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ state: 'investigating' }),
      }),
    );
    expect(result).toEqual(updated);
  });

  it('URL-encodes the incident id', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'inc/1', state: 'investigating' }));

    await postIncidentTransition('inc/1', 'investigating');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/incidents/inc%2F1'), expect.anything());
  });

  it('throws an ApiError built from the response body error on a rejected transition (e.g. skipped/invalid state)', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ error: "Cannot transition incident from 'open' to 'resolved'" }, { status: 400, ok: false }),
    );

    await expect(postIncidentTransition('inc-1', 'resolved')).rejects.toThrow(
      "Cannot transition incident from 'open' to 'resolved'",
    );
    await expect(postIncidentTransition('inc-1', 'resolved')).rejects.toThrow(ApiError);
  });

  it('falls back to a generic message when a non-2xx response has no JSON body', async () => {
    fetch.mockResolvedValueOnce({
      status: 502,
      ok: false,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(postIncidentTransition('inc-1', 'investigating')).rejects.toThrow(
      "Failed to transition incident inc-1 to 'investigating' (status 502)",
    );
  });

  it('normalizes a network failure into a catchable ApiError', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(postIncidentTransition('inc-1', 'investigating')).rejects.toThrow(ApiError);
  });
});
