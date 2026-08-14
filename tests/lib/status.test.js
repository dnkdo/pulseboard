import { describe, it, expect } from 'vitest';
import { computeOverallStatus, SEVERITY_ORDER, SEVERITY_META } from '../../src/lib/status.js';

describe('computeOverallStatus', () => {
  it('AC1: returns operational with a null severity color when the incident list is empty', () => {
    const result = computeOverallStatus([]);
    expect(result.status).toBe('operational');
    expect(result.color).toBeNull();
    expect(result.label).toBe(SEVERITY_META.operational.label);
  });

  it('matches the .adlc test-contract shape: computeOverallStatus([]) has a string status field', () => {
    const result = computeOverallStatus([]);
    expect(typeof result.status).toBe('string');
  });

  it('defends against null/undefined input by treating it as no active incidents', () => {
    expect(computeOverallStatus(undefined).status).toBe('operational');
    expect(computeOverallStatus(null).status).toBe('operational');
  });

  it('returns operational when every incident is resolved (no active incidents)', () => {
    const result = computeOverallStatus([
      { id: '1', severity: 'SEV1', status: 'resolved' },
      { id: '2', severity: 'SEV2', status: 'resolved' },
    ]);
    expect(result.status).toBe('operational');
    expect(result.color).toBeNull();
  });

  it('returns a single active incident’s own color/label', () => {
    const result = computeOverallStatus([{ id: '1', severity: 'SEV2', status: 'investigating' }]);
    expect(result.severity).toBe('SEV2');
    expect(result.color).toBe(SEVERITY_META.SEV2.color);
    expect(result.label).toBe(SEVERITY_META.SEV2.label);
  });

  it('AC2: returns the highest-severity incident among multiple concurrent active incidents', () => {
    const result = computeOverallStatus([
      { id: '1', severity: 'SEV2', status: 'investigating' },
      { id: '2', severity: 'SEV1', status: 'identified' },
      { id: '3', severity: 'SEV3', status: 'open' },
    ]);
    expect(result.severity).toBe('SEV1');
    expect(result.color).toBe(SEVERITY_META.SEV1.color);
    expect(result.label).toBe(SEVERITY_META.SEV1.label);
  });

  it('matches the .adlc test-contract fixture exactly: SEV1 beats SEV2 among active incidents', () => {
    const result = computeOverallStatus([
      { id: '1', severity: 'SEV2', status: 'investigating' },
      { id: '2', severity: 'SEV1', status: 'identified' },
    ]);
    expect(result.severity).toBe('SEV1');
  });

  it('returns a single consistent result when multiple active incidents share the highest severity', () => {
    const result = computeOverallStatus([
      { id: '1', severity: 'SEV1', status: 'open' },
      { id: '2', severity: 'SEV1', status: 'investigating' },
    ]);
    expect(result.severity).toBe('SEV1');
    expect(result.color).toBe(SEVERITY_META.SEV1.color);
    expect(result.label).toBe(SEVERITY_META.SEV1.label);
  });

  it('ignores resolved incidents when computing severity out of a mixed active/resolved list', () => {
    const result = computeOverallStatus([
      { id: '1', severity: 'SEV1', status: 'resolved' },
      { id: '2', severity: 'SEV3', status: 'open' },
    ]);
    expect(result.severity).toBe('SEV3');
  });

  it('treats every non-resolved status (open, investigating, identified) as active', () => {
    const result = computeOverallStatus([{ id: '1', severity: 'SEV3', status: 'open' }]);
    expect(result.status).toBe('SEV3');
  });

  it('exports the severity ranking used to break ties between concurrent incidents', () => {
    expect(SEVERITY_ORDER).toEqual(['SEV1', 'SEV2', 'SEV3']);
  });

  it('ranks an unrecognized severity below all known severities instead of winning by default', () => {
    const result = computeOverallStatus([
      { id: '1', severity: 'SEV3', status: 'open' },
      { id: '2', severity: 'BOGUS', status: 'open' },
    ]);
    expect(result.severity).toBe('SEV3');
  });
});
