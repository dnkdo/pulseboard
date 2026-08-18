import { describe, it, expect } from 'vitest';
import { computeBannerStatus } from '../../src/lib/bannerStatus.js';

describe('computeBannerStatus', () => {
  it('AC1: returns operational when the active-incident list is empty', () => {
    expect(computeBannerStatus([])).toBe('operational');
  });

  it('defends against null/undefined input by treating it as no active incidents', () => {
    expect(computeBannerStatus(undefined)).toBe('operational');
    expect(computeBannerStatus(null)).toBe('operational');
  });

  it('AC2: returns a single active incident\'s own severity as the banner state', () => {
    expect(computeBannerStatus([{ severity: 'critical' }])).toBe('critical');
  });

  it('matches the .adlc test-contract fixture exactly for a single critical incident', () => {
    expect(computeBannerStatus([{ severity: 'critical' }])).toBe('critical');
  });

  it('AC3: returns the highest-severity incident\'s state among multiple incidents of differing severity', () => {
    const result = computeBannerStatus([
      { id: '1', severity: 'minor', state: 'investigating' },
      { id: '2', severity: 'major', state: 'acknowledged' },
      { id: '3', severity: 'critical', state: 'resolving' },
    ]);
    expect(result).toBe('resolving');
  });

  it('AC4: re-derives the next-highest-severity incident once the top one is resolved and removed', () => {
    const all = [
      { id: '1', severity: 'minor', state: 'investigating' },
      { id: '2', severity: 'major', state: 'acknowledged' },
      { id: '3', severity: 'critical', state: 'resolving' },
    ];
    expect(computeBannerStatus(all)).toBe('resolving');

    // Simulate the partitioning module dropping the resolved SEV1/critical
    // incident from the active list — computeBannerStatus is pure and has
    // no memory, so calling it again re-derives from what's left.
    const afterCriticalResolved = all.filter((incident) => incident.id !== '3');
    expect(computeBannerStatus(afterCriticalResolved)).toBe('acknowledged');

    const afterMajorResolvedToo = afterCriticalResolved.filter((incident) => incident.id !== '2');
    expect(computeBannerStatus(afterMajorResolvedToo)).toBe('investigating');

    expect(computeBannerStatus([])).toBe('operational');
  });

  it('respects the canonical SEV1/SEV2/SEV3 enum in addition to the plain-language vocabulary', () => {
    const result = computeBannerStatus([
      { id: '1', severity: 'SEV3' },
      { id: '2', severity: 'SEV1' },
      { id: '3', severity: 'SEV2' },
    ]);
    expect(result).toBe('SEV1');
  });

  it('breaks ties at the same highest severity deterministically by taking the first-encountered incident', () => {
    const result = computeBannerStatus([
      { id: '1', severity: 'critical', state: 'first' },
      { id: '2', severity: 'critical', state: 'second' },
    ]);
    expect(result).toBe('first');
  });

  it('treats a missing/non-string severity as unranked rather than throwing', () => {
    const result = computeBannerStatus([
      { id: '1', state: 'no-severity-field' },
      { id: '2', severity: 'minor', state: 'investigating' },
    ]);
    expect(result).toBe('investigating');
  });

  it('ranks unknown/unranked severities below every known severity rather than winning by default', () => {
    const result = computeBannerStatus([
      { id: '1', severity: 'mystery-level' },
      { id: '2', severity: 'minor', state: 'investigating' },
    ]);
    expect(result).toBe('investigating');
  });

  it('full severity ordering sanity check: critical > major > minor > low', () => {
    const criticalWins = computeBannerStatus([{ severity: 'low' }, { severity: 'minor' }, { severity: 'major' }, { severity: 'critical' }]);
    expect(criticalWins).toBe('critical');

    const majorWins = computeBannerStatus([{ severity: 'low' }, { severity: 'minor' }, { severity: 'major' }]);
    expect(majorWins).toBe('major');

    const minorWins = computeBannerStatus([{ severity: 'low' }, { severity: 'minor' }]);
    expect(minorWins).toBe('minor');
  });
});
