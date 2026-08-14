import { describe, it, expect } from 'vitest';
import { sortTransitions } from './transitions.js';

describe('sortTransitions', () => {
  it('returns an empty array for empty input', () => {
    expect(sortTransitions([])).toEqual([]);
  });

  it('returns an equivalent single-element array for a single transition', () => {
    const single = [{ state: 'open', timestamp: '2026-08-13T10:00:00Z' }];
    expect(sortTransitions(single)).toEqual(single);
  });

  it('leaves already-ascending transitions in the same order', () => {
    const ascending = [
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
      { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
    ];
    expect(sortTransitions(ascending)).toEqual(ascending);
  });

  it('reverses fully reverse-sorted input into ascending order', () => {
    const reversed = [
      { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
    ];
    expect(sortTransitions(reversed)).toEqual([
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
      { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
    ]);
  });

  it('retains all entries (no drops) when timestamps are identical, tie order unspecified', () => {
    const tied = [
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'identified', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:00:00Z' },
    ];
    const result = sortTransitions(tied);
    expect(result).toHaveLength(tied.length);
    expect(result.map((t) => t.state).sort()).toEqual(tied.map((t) => t.state).sort());
  });

  it('matches the .adlc test-contract fixture exactly', () => {
    const unordered = [
      { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
    ];
    expect(sortTransitions(unordered)).toEqual([
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
      { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
    ]);
  });

  it('does not mutate the original input array (order or reference)', () => {
    const original = [
      { state: 'resolved', timestamp: '2026-08-13T12:00:00Z' },
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
    ];
    const originalCopy = original.map((t) => ({ ...t }));

    const result = sortTransitions(original);

    expect(original).toEqual(originalCopy);
    expect(result).not.toBe(original);
  });
});
