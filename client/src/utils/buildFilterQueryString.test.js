import { describe, it, expect } from 'vitest';
import { buildFilterQueryString } from './buildFilterQueryString.js';

describe('buildFilterQueryString', () => {
  it('AC: includes only the provided, non-empty filter values', () => {
    const result = buildFilterQueryString({ severity: 'SEV2', startDate: '2026-08-01', endDate: '' });

    expect(result).toContain('severity=SEV2');
    expect(result).toContain('startDate=2026-08-01');
    expect(result).not.toContain('endDate');
  });

  it('serializes all three fields when provided', () => {
    const result = buildFilterQueryString({ severity: 'SEV1', startDate: '2026-08-01', endDate: '2026-08-10' });

    expect(result).toBe('severity=SEV1&startDate=2026-08-01&endDate=2026-08-10');
  });

  it('joins an array of severities into a comma-separated value, matching the server\'s parseSeverityParam', () => {
    const result = buildFilterQueryString({ severity: ['SEV1', 'SEV2'], startDate: '2026-08-01', endDate: '2026-08-10' });

    expect(result).toContain('startDate=2026-08-01');
    expect(new URLSearchParams(result).get('severity')).toBe('SEV1,SEV2');
  });

  it('returns an empty string when no filters are provided', () => {
    expect(buildFilterQueryString({})).toBe('');
    expect(buildFilterQueryString()).toBe('');
  });

  it('treats undefined, null, and empty string identically (all omitted)', () => {
    expect(buildFilterQueryString({ severity: undefined, startDate: null, endDate: '' })).toBe('');
  });

  it('treats a whitespace-only string as empty', () => {
    expect(buildFilterQueryString({ severity: '   ', startDate: '2026-08-01' })).toBe('startDate=2026-08-01');
  });

  it('emits no stray "&" or dangling key when only startDate/endDate are given (no severity)', () => {
    const result = buildFilterQueryString({ startDate: '2026-08-01', endDate: '2026-08-10' });

    expect(result).toBe('startDate=2026-08-01&endDate=2026-08-10');
    expect(result.startsWith('&')).toBe(false);
    expect(result.endsWith('&')).toBe(false);
    expect(result).not.toMatch(/=&|&&/);
  });

  it('emits no stray "&" or dangling key when only severity is given (no dates)', () => {
    const result = buildFilterQueryString({ severity: 'SEV3' });

    expect(result).toBe('severity=SEV3');
  });

  it('URL-encodes special characters', () => {
    const result = buildFilterQueryString({ severity: 'SEV1 & SEV2' });

    expect(result).toBe('severity=SEV1+%26+SEV2');
    expect(new URLSearchParams(result).get('severity')).toBe('SEV1 & SEV2');
  });

  it('does not include a leading "?"', () => {
    const result = buildFilterQueryString({ severity: 'SEV1' });

    expect(result.startsWith('?')).toBe(false);
  });

  // The function does no severity validation/case-mapping — it serializes whatever
  // string it's given verbatim, so these arbitrary-string cases (matching the
  // .adlc/testcases.yaml contract literally) must round-trip unchanged.
  it('serializes an arbitrary severity string verbatim alongside a startDate, omitting a blank endDate', () => {
    const result = buildFilterQueryString({ severity: 'HIGH', startDate: '2026-08-01', endDate: '' });

    expect(result).toBe('severity=HIGH&startDate=2026-08-01');
  });

  it('serializes an arbitrary severity string verbatim alongside an endDate, omitting a blank startDate', () => {
    const result = buildFilterQueryString({ severity: 'high', startDate: '', endDate: '2026-08-18' });

    expect(result).toBe('severity=high&endDate=2026-08-18');
  });
});
