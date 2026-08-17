import { describe, it, expect } from 'vitest';
import { filterActiveIncidents, sortPastIncidentsDesc } from '../../src/lib/incidents.js';

describe('filterActiveIncidents', () => {
  it('AC: returns an empty array when all incidents are resolved', () => {
    const result = filterActiveIncidents([
      { id: '1', status: 'resolved', severity: 'critical', title: 'API Down', timestamp: '2026-01-01T00:00:00Z' },
      {
        id: '2',
        status: 'resolved',
        severity: 'major',
        title: 'Database Lag',
        timestamp: '2026-01-02T00:00:00Z',
      },
    ]);
    expect(result).toEqual([]);
  });

  it('AC: returns only incidents whose status is not resolved, ordered by severity descending', () => {
    const result = filterActiveIncidents([
      { id: '1', title: 'Low Priority Issue', status: 'active', severity: 'low' },
      { id: '2', title: 'Critical Issue Resolved', status: 'resolved', severity: 'critical' },
      { id: '3', title: 'Critical Issue Active', status: 'active', severity: 'critical' },
      { id: '4', title: 'Major Issue', status: 'active', severity: 'major' },
      { id: '5', title: 'Minor Issue', status: 'investigating', severity: 'minor' },
    ]);

    expect(result).toEqual([
      { id: '3', title: 'Critical Issue Active', status: 'active', severity: 'critical' },
      { id: '4', title: 'Major Issue', status: 'active', severity: 'major' },
      { id: '5', title: 'Minor Issue', status: 'investigating', severity: 'minor' },
      { id: '1', title: 'Low Priority Issue', status: 'active', severity: 'low' },
    ]);
  });

  it('returns a single active incident unchanged when it is the only one', () => {
    const incident = { id: '1', title: 'Solo Incident', status: 'open', severity: 'SEV2' };
    expect(filterActiveIncidents([incident])).toEqual([incident]);
  });

  it('returns an empty array for empty input', () => {
    expect(filterActiveIncidents([])).toEqual([]);
  });

  it('treats a missing/unknown status as active, not resolved', () => {
    const result = filterActiveIncidents([{ id: '1', title: 'No Status Field', severity: 'SEV1' }]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('does not mutate the input array or its elements', () => {
    const incident1 = { id: '1', status: 'active', severity: 'low' };
    const incident2 = { id: '2', status: 'active', severity: 'critical' };
    const input = [incident1, incident2];
    const inputCopy = [...input];

    const result = filterActiveIncidents(input);

    expect(input).toEqual(inputCopy);
    expect(input[0]).toBe(incident1);
    expect(input[1]).toBe(incident2);
    expect(result).not.toBe(input);
  });

  it('ranks the canonical SEV1/SEV2/SEV3 enum in the correct descending order', () => {
    const result = filterActiveIncidents([
      { id: '1', status: 'open', severity: 'SEV3' },
      { id: '2', status: 'open', severity: 'SEV1' },
      { id: '3', status: 'open', severity: 'SEV2' },
    ]);
    expect(result.map((incident) => incident.id)).toEqual(['2', '3', '1']);
  });

  it('returns [] instead of throwing for non-array input', () => {
    expect(filterActiveIncidents(null)).toEqual([]);
    expect(filterActiveIncidents(undefined)).toEqual([]);
  });
});

describe('sortPastIncidentsDesc', () => {
  it('AC: returns resolved incidents ordered from most recently resolved to least recently resolved', () => {
    const result = sortPastIncidentsDesc([
      { title: 'A', status: 'resolved', resolvedAt: '2026-08-15T10:00:00Z' },
      { title: 'B', status: 'investigating', resolvedAt: '2026-08-16T10:00:00Z' },
      { title: 'C', status: 'resolved', resolvedAt: '2026-08-17T10:00:00Z' },
      { title: 'D', status: 'resolved', resolvedAt: '2026-08-14T10:00:00Z' },
    ]);

    expect(result).toEqual([
      { title: 'C', status: 'resolved', resolvedAt: '2026-08-17T10:00:00Z' },
      { title: 'A', status: 'resolved', resolvedAt: '2026-08-15T10:00:00Z' },
      { title: 'D', status: 'resolved', resolvedAt: '2026-08-14T10:00:00Z' },
    ]);
  });

  it('AC: excludes unresolved incidents (open, investigating, identified) from the result', () => {
    const result = sortPastIncidentsDesc([
      { id: 1, status: 'investigating', title: 'Unresolved', resolvedAt: null },
      { id: 2, status: 'resolved', title: 'Resolved A', resolvedAt: '2026-08-15T10:00:00Z' },
      { id: 3, status: 'monitoring', title: 'Another unresolved', resolvedAt: null },
      { id: 4, status: 'resolved', title: 'Resolved B', resolvedAt: '2026-08-16T10:00:00Z' },
      { id: 5, status: 'open', title: 'Open incident', resolvedAt: null },
      { id: 6, status: 'identified', title: 'Identified incident', resolvedAt: null },
    ]);

    expect(result).toEqual([
      { id: 4, status: 'resolved', title: 'Resolved B', resolvedAt: '2026-08-16T10:00:00Z' },
      { id: 2, status: 'resolved', title: 'Resolved A', resolvedAt: '2026-08-15T10:00:00Z' },
    ]);
  });

  it('returns an empty array when no incidents are resolved', () => {
    expect(sortPastIncidentsDesc([{ id: '1', status: 'open', resolvedAt: '2026-08-01T00:00:00Z' }])).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(sortPastIncidentsDesc([])).toEqual([]);
  });

  it('returns [] instead of throwing for non-array input', () => {
    expect(sortPastIncidentsDesc(null)).toEqual([]);
    expect(sortPastIncidentsDesc(undefined)).toEqual([]);
  });

  it('does not mutate the input array or its elements', () => {
    const incident1 = { id: '1', status: 'resolved', resolvedAt: '2026-08-01T00:00:00Z' };
    const incident2 = { id: '2', status: 'resolved', resolvedAt: '2026-08-10T00:00:00Z' };
    const input = [incident1, incident2];
    const inputCopy = [...input];

    const result = sortPastIncidentsDesc(input);

    expect(input).toEqual(inputCopy);
    expect(input[0]).toBe(incident1);
    expect(input[1]).toBe(incident2);
    expect(result).not.toBe(input);
  });

  it('treats ties in resolvedAt by preserving original relative order (stable sort)', () => {
    const first = { id: '1', status: 'resolved', resolvedAt: '2026-08-10T00:00:00Z' };
    const second = { id: '2', status: 'resolved', resolvedAt: '2026-08-10T00:00:00Z' };
    expect(sortPastIncidentsDesc([first, second])).toEqual([first, second]);
  });

  it('pushes resolved incidents with missing or malformed resolvedAt to the end instead of throwing', () => {
    const valid = { id: '1', status: 'resolved', resolvedAt: '2026-08-10T00:00:00Z' };
    const missing = { id: '2', status: 'resolved', resolvedAt: null };
    const malformed = { id: '3', status: 'resolved', resolvedAt: 'not-a-date' };
    const undefinedField = { id: '4', status: 'resolved' };

    const result = sortPastIncidentsDesc([missing, malformed, valid, undefinedField]);

    expect(result[0]).toBe(valid);
    expect(result).toHaveLength(4);
    expect(result.slice(1).map((incident) => incident.id).sort()).toEqual(['2', '3', '4']);
  });
});
