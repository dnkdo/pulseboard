import { describe, it, expect } from 'vitest';
import { formatTimestamp } from './formatTimestamp.js';

describe('formatTimestamp', () => {
  it('formats a known ISO timestamp into the exact expected human-readable string', () => {
    expect(formatTimestamp('2026-08-18T10:30:00Z')).toBe('2026-Aug-18, 10:30 AM');
  });

  it('formats a midnight-crossing timestamp with a single-digit day correctly', () => {
    expect(formatTimestamp('2026-01-01T23:05:00Z')).toBe('2026-Jan-1, 11:05 PM');
  });

  it('accepts a numeric epoch-millisecond timestamp', () => {
    expect(formatTimestamp(1692547200000)).toBe('2023-Aug-20, 4:00 PM');
  });

  it('returns a fallback string for a missing timestamp', () => {
    expect(formatTimestamp(null)).toBe('Unknown time');
    expect(formatTimestamp(undefined)).toBe('Unknown time');
    expect(formatTimestamp('')).toBe('Unknown time');
  });

  it('returns a fallback string for an unparseable timestamp', () => {
    expect(formatTimestamp('not-a-date')).toBe('Unknown time');
  });
});
