import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calculateUptime } from './uptime.js';

const MODULE_PATH = fileURLToPath(new URL('./uptime.js', import.meta.url));

describe('calculateUptime', () => {
  const fixtures = [
    {
      name: 'zero downtime is 100% uptime',
      downtimeMs: 0,
      totalPeriodMs: 1_000_000,
      expectedPercent: 100,
    },
    {
      name: 'downtime equal to the full period is 0% uptime',
      downtimeMs: 1_000_000,
      totalPeriodMs: 1_000_000,
      expectedPercent: 0,
    },
    {
      name: '1% downtime yields 99% uptime (test-contract fixture)',
      downtimeMs: 10_000,
      totalPeriodMs: 1_000_000,
      expectedPercent: 99,
    },
    {
      name: '10% downtime yields a clean 90% uptime',
      downtimeMs: 100_000,
      totalPeriodMs: 1_000_000,
      expectedPercent: 90,
    },
    {
      name: '25% downtime yields a clean 75% uptime',
      downtimeMs: 250_000,
      totalPeriodMs: 1_000_000,
      expectedPercent: 75,
    },
  ];

  it.each(fixtures)('$name', ({ downtimeMs, totalPeriodMs, expectedPercent }) => {
    expect(calculateUptime(downtimeMs, totalPeriodMs)).toBe(expectedPercent);
  });

  it('matches the .adlc test-contract case exactly: calculateUptime(10000, 1000000) === 99', () => {
    expect(calculateUptime(10000, 1000000)).toBe(99);
  });

  it('returns the exact repeating-decimal percentage for a non-terminating fraction', () => {
    // (3 - 1) / 3 * 100 = 66.66...% — not representable exactly in binary
    // floating point, so this asserts the precise double-precision result.
    expect(calculateUptime(1, 3)).toBeCloseTo(66.66666666666667, 10);
  });

  it('guards division-by-zero: a zero-length period returns 0 instead of NaN/Infinity', () => {
    expect(calculateUptime(500, 0)).toBe(0);
  });

  it('is a pure function: identical inputs always produce identical output', () => {
    const first = calculateUptime(42_000, 864_000);
    const second = calculateUptime(42_000, 864_000);
    expect(first).toBe(second);
  });

  it('performs no wall-clock reads (no Date.now()/new Date() in the module source)', () => {
    const source = readFileSync(MODULE_PATH, 'utf8');
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new Date/);
  });
});
