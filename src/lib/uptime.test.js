import { describe, it, expect } from 'vitest';
import { formatUptimePercentage } from './uptime.js';

describe('formatUptimePercentage', () => {
  it('matches the .adlc test-contract fixture exactly: 0.9987 -> "99.87%"', () => {
    expect(formatUptimePercentage(0.9987)).toBe('99.87%');
  });

  it('formats zero uptime as the 0.00% boundary', () => {
    expect(formatUptimePercentage(0)).toBe('0.00%');
  });

  it('formats full uptime as the 100.00% boundary', () => {
    expect(formatUptimePercentage(1)).toBe('100.00%');
  });

  it('rounds a mid-range ratio to two decimal places', () => {
    expect(formatUptimePercentage(0.12345)).toBe('12.35%');
  });

  it('always appends a trailing percent sign', () => {
    expect(formatUptimePercentage(0.5)).toMatch(/%$/);
  });
});
