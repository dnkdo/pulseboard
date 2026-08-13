import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getIncidentById } from '../../src/api/incidents.js';
import { ApiError } from '../../src/api/httpClient.js';

function jsonResponse(body, { status = 200, ok = true } = {}) {
  return {
    status,
    ok,
    json: () => Promise.resolve(body),
  };
}

describe('getIncidentById', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the full incident with public and internal fields intact and transitions sorted ascending', async () => {
    const incident = {
      id: 'inc-1',
      title: 'API latency spike',
      status: 'investigating',
      severity: 'SEV2',
      internalNotes: 'escalate to DB team',
      assignee: 'dana',
      publicUpdate: 'We are investigating elevated API latency.',
      transitions: [
        { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
        { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
        { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
      ],
    };
    fetch.mockResolvedValueOnce(jsonResponse(incident));

    const result = await getIncidentById('inc-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/inc-1'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    );
    expect(result.transitions.map((t) => t.state)).toEqual(['open', 'investigating', 'resolved']);
    // Internal-only fields must survive unfiltered — filtering is a separate concern.
    expect(result.internalNotes).toBe('escalate to DB team');
    expect(result.assignee).toBe('dana');
    // Public fields must also survive.
    expect(result.publicUpdate).toBe('We are investigating elevated API latency.');
    expect(result.id).toBe('inc-1');
  });

  it('URL-encodes the incident id', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'inc/1', transitions: [] }));

    await getIncidentById('inc/1');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/incidents/inc%2F1'), expect.anything());
  });

  it('returns null when the API responds 404', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(null, { status: 404, ok: false }));

    const result = await getIncidentById('missing-id');

    expect(result).toBeNull();
  });

  it('throws for a non-404 HTTP error so callers can distinguish it from "not found"', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(null, { status: 500, ok: false }));

    await expect(getIncidentById('inc-1')).rejects.toThrow(ApiError);
  });

  it('normalizes a network failure into a catchable error instead of an unhandled rejection', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(getIncidentById('inc-1')).rejects.toThrow(ApiError);
  });

  it('returns the incident unmodified when transitions is missing', async () => {
    const incident = { id: 'inc-3', title: 'No transitions yet' };
    fetch.mockResolvedValueOnce(jsonResponse(incident));

    const result = await getIncidentById('inc-3');

    expect(result).toEqual(incident);
  });

  it('leaves transitions in stable original order when timestamps are equal or malformed', async () => {
    const incident = {
      id: 'inc-2',
      transitions: [
        { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
        { state: 'investigating', timestamp: 'not-a-date' },
        { state: 'identified', timestamp: '2026-08-13T10:00:00Z' },
      ],
    };
    fetch.mockResolvedValueOnce(jsonResponse(incident));

    const result = await getIncidentById('inc-2');

    expect(result.transitions.map((t) => t.state)).toEqual(['open', 'investigating', 'identified']);
  });
});
