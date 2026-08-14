import { describe, it, expect } from 'vitest';
import { buildIncidentTimeline } from '../../src/lib/timeline.js';

describe('buildIncidentTimeline', () => {
  it('matches the .adlc test-contract case: sorts incidents chronologically ascending', () => {
    const input = [
      { id: 'b', created_at: '2026-08-12T10:00:00Z' },
      { id: 'a', created_at: '2026-08-10T10:00:00Z' },
    ];
    expect(buildIncidentTimeline(input)).toEqual([
      { id: 'a', created_at: '2026-08-10T10:00:00Z' },
      { id: 'b', created_at: '2026-08-12T10:00:00Z' },
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'b', created_at: '2026-08-12T10:00:00Z' },
      { id: 'a', created_at: '2026-08-10T10:00:00Z' },
    ];
    const inputCopy = [...input];
    buildIncidentTimeline(input);
    expect(input).toEqual(inputCopy);
  });

  it('returns a new array reference, not the same array instance', () => {
    const input = [{ id: 'a', created_at: '2026-08-10T10:00:00Z' }];
    expect(buildIncidentTimeline(input)).not.toBe(input);
  });

  it('preserves original relative order for duplicate timestamps (stable sort)', () => {
    const input = [
      { id: 'first', created_at: '2026-08-10T10:00:00Z' },
      { id: 'second', created_at: '2026-08-10T10:00:00Z' },
      { id: 'third', created_at: '2026-08-10T10:00:00Z' },
    ];
    expect(buildIncidentTimeline(input).map((i) => i.id)).toEqual(['first', 'second', 'third']);
  });

  it('pushes entries with a missing timestamp to the end, deterministically', () => {
    const input = [
      { id: 'no-timestamp-1' },
      { id: 'dated', created_at: '2026-08-10T10:00:00Z' },
      { id: 'no-timestamp-2' },
    ];
    expect(buildIncidentTimeline(input).map((i) => i.id)).toEqual(['dated', 'no-timestamp-1', 'no-timestamp-2']);
  });

  it('pushes entries with an invalid/unparseable timestamp to the end', () => {
    const input = [
      { id: 'bad', created_at: 'not-a-date' },
      { id: 'dated', created_at: '2026-08-10T10:00:00Z' },
    ];
    expect(buildIncidentTimeline(input).map((i) => i.id)).toEqual(['dated', 'bad']);
  });

  it('also reads createdAt (camelCase) for incidents produced by the in-memory incident store', () => {
    const input = [
      { id: 'b', createdAt: '2026-08-12T10:00:00Z' },
      { id: 'a', createdAt: '2026-08-10T10:00:00Z' },
    ];
    expect(buildIncidentTimeline(input).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns an empty array for an empty input', () => {
    expect(buildIncidentTimeline([])).toEqual([]);
  });

  it('returns an empty array for non-array input rather than throwing', () => {
    expect(buildIncidentTimeline(null)).toEqual([]);
    expect(buildIncidentTimeline(undefined)).toEqual([]);
  });
});
