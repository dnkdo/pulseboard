import { describe, it, expect, vi } from 'vitest';
import { filterIncidents } from '../server/utils/filterIncidents.js';

const FIXTURES = Object.freeze([
  { id: 1, severity: 'SEV1', createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 2, severity: 'SEV2', createdAt: '2026-08-05T00:00:00.000Z' },
  { id: 3, severity: 'SEV3', createdAt: '2026-08-10T00:00:00.000Z' },
  { id: 4, severity: 'SEV1', createdAt: '2026-08-15T00:00:00.000Z' },
]);

describe('filterIncidents', () => {
  describe('severity filtering', () => {
    it('returns only incidents matching a single severity', () => {
      expect(filterIncidents(FIXTURES, { severity: 'SEV1' })).toEqual([FIXTURES[0], FIXTURES[3]]);
    });

    it('returns only incidents matching a set of severities', () => {
      expect(filterIncidents(FIXTURES, { severity: ['SEV1', 'SEV3'] })).toEqual([
        FIXTURES[0],
        FIXTURES[2],
        FIXTURES[3],
      ]);
    });

    it('matches the .adlc test-contract fixture exactly', () => {
      const incidents = [
        { id: 1, severity: 'SEV1', createdAt: '2026-08-01' },
        { id: 2, severity: 'SEV2', createdAt: '2026-08-02' },
      ];
      expect(filterIncidents(incidents, { severity: ['SEV1'] })).toEqual([
        { id: 1, severity: 'SEV1', createdAt: '2026-08-01' },
      ]);
    });

    it('is a no-op when severity is omitted', () => {
      expect(filterIncidents(FIXTURES, {})).toEqual(FIXTURES);
    });

    it('is a no-op when severity is an empty array', () => {
      expect(filterIncidents(FIXTURES, { severity: [] })).toEqual(FIXTURES);
    });

    it('returns [] when no incident matches the requested severity', () => {
      expect(filterIncidents(FIXTURES, { severity: 'SEV_UNKNOWN' })).toEqual([]);
    });
  });

  describe('date range filtering', () => {
    it('returns only incidents with createdAt inside the inclusive window', () => {
      const result = filterIncidents(FIXTURES, {
        startDate: '2026-08-03T00:00:00.000Z',
        endDate: '2026-08-12T00:00:00.000Z',
      });
      expect(result).toEqual([FIXTURES[1], FIXTURES[2]]);
    });

    it('includes an incident exactly on the startDate boundary', () => {
      const result = filterIncidents(FIXTURES, {
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-01T00:00:00.000Z',
      });
      expect(result).toEqual([FIXTURES[0]]);
    });

    it('includes an incident exactly on the endDate boundary', () => {
      const result = filterIncidents(FIXTURES, {
        startDate: '2026-08-15T00:00:00.000Z',
        endDate: '2026-08-15T00:00:00.000Z',
      });
      expect(result).toEqual([FIXTURES[3]]);
    });

    it('matches the .adlc test-contract fixture exactly', () => {
      const incidents = [
        { id: 1, severity: 'SEV1', createdAt: '2026-08-01' },
        { id: 2, severity: 'SEV2', createdAt: '2026-08-10' },
      ];
      expect(filterIncidents(incidents, { startDate: '2026-08-05', endDate: '2026-08-15' })).toEqual([
        { id: 2, severity: 'SEV2', createdAt: '2026-08-10' },
      ]);
    });

    it('supports an open-ended range with only startDate', () => {
      expect(filterIncidents(FIXTURES, { startDate: '2026-08-10T00:00:00.000Z' })).toEqual([
        FIXTURES[2],
        FIXTURES[3],
      ]);
    });

    it('supports an open-ended range with only endDate', () => {
      expect(filterIncidents(FIXTURES, { endDate: '2026-08-05T00:00:00.000Z' })).toEqual([
        FIXTURES[0],
        FIXTURES[1],
      ]);
    });

    it('is a no-op when both startDate and endDate are omitted', () => {
      expect(filterIncidents(FIXTURES, {})).toEqual(FIXTURES);
    });

    it('excludes an incident whose own createdAt is unparseable when a date filter is active', () => {
      const withBadDate = [...FIXTURES, { id: 5, severity: 'SEV1', createdAt: 'not-a-date' }];
      const result = filterIncidents(withBadDate, { startDate: '2026-08-01T00:00:00.000Z' });
      expect(result.some((incident) => incident.id === 5)).toBe(false);
    });

    it('treats an unparseable startDate as no filter instead of matching nothing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(filterIncidents(FIXTURES, { startDate: 'not-a-date' })).toEqual(FIXTURES);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('combined filters', () => {
    it('applies severity AND date range together', () => {
      const result = filterIncidents(FIXTURES, {
        severity: ['SEV1'],
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-31T00:00:00.000Z',
      });
      expect(result).toEqual([FIXTURES[3]]);
    });

    it('returns [] when severity matches but no incident falls in the date range', () => {
      const result = filterIncidents(FIXTURES, {
        severity: ['SEV1'],
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T00:00:00.000Z',
      });
      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('returns [] for an empty incidents array', () => {
      expect(filterIncidents([], { severity: 'SEV1' })).toEqual([]);
    });

    it('does not mutate the input array', () => {
      const copy = FIXTURES.map((incident) => ({ ...incident }));
      filterIncidents(FIXTURES, { severity: 'SEV1' });
      expect(FIXTURES).toEqual(copy);
    });
  });
});
