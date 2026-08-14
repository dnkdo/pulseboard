import { describe, it, expect } from 'vitest';
import { computeStatCards } from './stats.js';

const NOW = new Date('2026-08-13T12:00:00.000Z');

describe('computeStatCards', () => {
  it('matches the .adlc test-contract case: excludes resolved incidents from openIncidents', () => {
    const stats = computeStatCards([{ status: 'open' }, { status: 'resolved' }, { status: 'investigating' }], 99.95);
    expect(stats.openIncidents).toBe(2);
  });

  it('matches the .adlc test-contract case: mttr7d is a number', () => {
    const stats = computeStatCards(
      [{ status: 'resolved', created_at: '2026-08-10T00:00:00Z', resolved_at: '2026-08-10T01:30:00Z' }],
      99.95
    );
    expect(typeof stats.mttr7d).toBe('number');
  });

  it('excludes resolved incidents from openIncidents using the DB-shaped `state` field', () => {
    const incidents = [
      { state: 'open' },
      { state: 'investigating' },
      { state: 'identified' },
      { state: 'resolved' },
      { state: 'resolved' },
    ];
    const stats = computeStatCards(incidents, 100, NOW);
    expect(stats.openIncidents).toBe(3);
  });

  it('passes uptimePercentage through unchanged (precomputed by the uptime service)', () => {
    const stats = computeStatCards([], 87.654, NOW);
    expect(stats.uptimePercentage).toBe(87.654);
  });

  describe('mttr7d 7-day boundary', () => {
    it('includes an incident resolved exactly 7 days ago (inclusive boundary)', () => {
      const resolvedAt = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const createdAt = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString();
      const stats = computeStatCards(
        [{ state: 'resolved', created_at: createdAt, resolved_at: resolvedAt }],
        100,
        NOW
      );
      expect(stats.mttr7d).toBe(30);
    });

    it('excludes an incident resolved just outside the 7-day window', () => {
      const resolvedAt = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000 - 1000).toISOString();
      const createdAt = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const stats = computeStatCards(
        [{ state: 'resolved', created_at: createdAt, resolved_at: resolvedAt }],
        100,
        NOW
      );
      expect(stats.mttr7d).toBe(0);
    });

    it('excludes still-open incidents from the mttr7d average entirely', () => {
      const stats = computeStatCards(
        [
          { state: 'open', created_at: '2026-08-12T00:00:00Z' },
          {
            state: 'resolved',
            created_at: '2026-08-12T00:00:00Z',
            updated_at: '2026-08-12T01:00:00Z',
          },
        ],
        100,
        NOW
      );
      // only the resolved incident contributes: 60 minutes, not averaged with the open one
      expect(stats.mttr7d).toBe(60);
    });

    it('returns 0 (not NaN) when there are no incidents resolved in the last 7 days', () => {
      const stats = computeStatCards([{ state: 'open' }], 100, NOW);
      expect(stats.mttr7d).toBe(0);
    });

    it('derives resolvedAt from updated_at when resolved_at is absent (DB-shaped rows)', () => {
      const stats = computeStatCards(
        [{ state: 'resolved', created_at: '2026-08-13T10:00:00Z', updated_at: '2026-08-13T11:15:00Z' }],
        100,
        NOW
      );
      expect(stats.mttr7d).toBe(75);
    });
  });

  describe('incidentsThisMonth boundary', () => {
    it('counts an incident created on the first day of the current UTC month', () => {
      const stats = computeStatCards([{ state: 'open', created_at: '2026-08-01T00:00:00.000Z' }], 100, NOW);
      expect(stats.incidentsThisMonth).toBe(1);
    });

    it('excludes an incident created on the last day of the previous UTC month', () => {
      const stats = computeStatCards([{ state: 'open', created_at: '2026-07-31T23:59:59.999Z' }], 100, NOW);
      expect(stats.incidentsThisMonth).toBe(0);
    });

    it('counts multiple incidents created within the current calendar month regardless of state', () => {
      const stats = computeStatCards(
        [
          { state: 'open', created_at: '2026-08-05T00:00:00Z' },
          { state: 'resolved', created_at: '2026-08-06T00:00:00Z', updated_at: '2026-08-06T01:00:00Z' },
          { state: 'open', created_at: '2026-07-15T00:00:00Z' },
        ],
        100,
        NOW
      );
      expect(stats.incidentsThisMonth).toBe(2);
    });
  });

  it('handles an empty incident list without throwing', () => {
    const stats = computeStatCards([], 100, NOW);
    expect(stats).toEqual({ openIncidents: 0, mttr7d: 0, incidentsThisMonth: 0, uptimePercentage: 100 });
  });
});
