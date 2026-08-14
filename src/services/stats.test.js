import { describe, it, expect } from 'vitest';
import { computeMTTR, computeOpenCount, computeIncidentsThisMonth } from './stats.js';
import { INCIDENT_STATES } from '../models/schema.js';

describe('computeMTTR', () => {
  it('returns the exact mean time-to-resolution in minutes across resolved incidents', () => {
    const incidents = [
      {
        state: 'resolved',
        stateHistory: [
          { state: 'open', timestamp: '2026-08-01T00:00:00.000Z' },
          { state: 'resolved', timestamp: '2026-08-01T01:00:00.000Z' },
        ],
      },
      {
        state: 'resolved',
        stateHistory: [
          { state: 'open', timestamp: '2026-08-02T00:00:00.000Z' },
          { state: 'resolved', timestamp: '2026-08-02T00:30:00.000Z' },
        ],
      },
    ];

    // (60 + 30) / 2 = 45
    expect(computeMTTR(incidents)).toBe(45);
  });

  it('excludes open/investigating/identified incidents from the mean', () => {
    const incidents = [
      {
        state: 'resolved',
        stateHistory: [
          { state: 'open', timestamp: '2026-08-01T00:00:00.000Z' },
          { state: 'resolved', timestamp: '2026-08-01T01:00:00.000Z' },
        ],
      },
      { state: 'open', stateHistory: [{ state: 'open', timestamp: '2026-08-03T00:00:00.000Z' }] },
      {
        state: 'investigating',
        stateHistory: [{ state: 'open', timestamp: '2026-08-03T00:00:00.000Z' }],
      },
    ];

    expect(computeMTTR(incidents)).toBe(60);
  });

  it('supports raw SQLite row shape (created_at/updated_at, no stateHistory)', () => {
    const incidents = [
      { state: 'resolved', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T02:00:00.000Z' },
    ];

    expect(computeMTTR(incidents)).toBe(120);
  });

  it('returns 0, not NaN, when there are no resolved incidents', () => {
    const incidents = [{ state: 'open' }, { state: 'investigating' }];
    expect(computeMTTR(incidents)).toBe(0);
  });

  it('returns 0 for an empty array', () => {
    expect(computeMTTR([])).toBe(0);
  });
});

describe('computeOpenCount', () => {
  it('returns the exact count of incidents not in the resolved state', () => {
    const incidents = [{ state: 'open' }, { state: 'resolved' }, { state: 'investigating' }];
    expect(computeOpenCount(incidents)).toBe(2);
  });

  it('returns 0 when every incident is resolved', () => {
    const incidents = [{ state: 'resolved' }, { state: 'resolved' }];
    expect(computeOpenCount(incidents)).toBe(0);
  });

  it('returns 0 for an empty array', () => {
    expect(computeOpenCount([])).toBe(0);
  });

  it('filters on the canonical `state` field from src/models/schema.js INCIDENT_STATES, not an unrelated `status` field', () => {
    const resolvedValue = INCIDENT_STATES[INCIDENT_STATES.length - 1];
    expect(resolvedValue).toBe('resolved');

    const incidents = [
      { state: 'open', status: 'resolved' }, // decoy `status` field must be ignored
      { state: resolvedValue },
    ];

    // Only the second incident (state === 'resolved') is excluded; the first
    // is counted as open even though its `status` field says "resolved".
    expect(computeOpenCount(incidents)).toBe(1);
  });
});

describe('computeIncidentsThisMonth', () => {
  it("counts only incidents whose createdAt falls in the reference date's UTC month and year", () => {
    const incidents = [
      { createdAt: '2026-08-05T00:00:00.000Z' },
      { createdAt: '2026-07-01T00:00:00.000Z' },
    ];
    expect(computeIncidentsThisMonth(incidents, '2026-08-13T00:00:00.000Z')).toBe(1);
  });

  it('excludes the same calendar month in a different year', () => {
    const incidents = [
      { createdAt: '2025-08-05T00:00:00.000Z' },
      { createdAt: '2026-08-05T00:00:00.000Z' },
    ];
    expect(computeIncidentsThisMonth(incidents, '2026-08-13T00:00:00.000Z')).toBe(1);
  });

  it('handles the last-day-of-month boundary correctly', () => {
    const incidents = [
      { createdAt: '2026-08-31T23:59:59.999Z' },
      { createdAt: '2026-09-01T00:00:00.000Z' },
    ];
    expect(computeIncidentsThisMonth(incidents, '2026-08-31T12:00:00.000Z')).toBe(1);
  });

  it('handles a leap-year February correctly', () => {
    const incidents = [
      { createdAt: '2028-02-29T00:00:00.000Z' },
      { createdAt: '2028-03-01T00:00:00.000Z' },
    ];
    expect(computeIncidentsThisMonth(incidents, '2028-02-15T00:00:00.000Z')).toBe(1);
  });

  it('returns 0 when no incident createdAt matches the reference month', () => {
    const incidents = [{ createdAt: '2026-01-01T00:00:00.000Z' }];
    expect(computeIncidentsThisMonth(incidents, '2026-08-13T00:00:00.000Z')).toBe(0);
  });
});
