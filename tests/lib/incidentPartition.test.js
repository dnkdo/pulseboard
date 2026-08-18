import { describe, it, expect } from 'vitest';
import { partitionIncidents } from '../../src/lib/incidentPartition.js';

describe('partitionIncidents', () => {
  it('matches the .adlc test-contract case: a single non-resolved incident is classified as active', () => {
    const input = [{ id: 'inc-1', status: 'investigating' }];
    expect(partitionIncidents(input)).toEqual({
      active: [{ id: 'inc-1', status: 'investigating' }],
      past: [],
    });
  });

  it('matches the .adlc test-contract case: a resolved incident is classified as past and excluded from active', () => {
    const input = [{ id: '1', status: 'resolved' }];
    expect(partitionIncidents(input)).toEqual({
      active: [],
      past: [{ id: '1', status: 'resolved' }],
    });
  });

  it('matches the .adlc test-contract case: partitions mixed-state incidents (DB-shaped `state` field)', () => {
    const input = [
      { id: 1, state: 'open' },
      { id: 2, state: 'resolved' },
      { id: 3, state: 'identified' },
    ];
    expect(partitionIncidents(input)).toEqual({
      active: [
        { id: 1, state: 'open' },
        { id: 3, state: 'identified' },
      ],
      past: [{ id: 2, state: 'resolved' }],
    });
  });

  it('returns empty partitions for an empty incident list', () => {
    expect(partitionIncidents([])).toEqual({ active: [], past: [] });
  });

  it.each(['open', 'investigating', 'identified', 'monitoring', 'some-future-non-terminal-state'])(
    'classifies non-terminal status "%s" as active',
    (status) => {
      const result = partitionIncidents([{ id: 'x', status }]);
      expect(result.active).toEqual([{ id: 'x', status }]);
      expect(result.past).toEqual([]);
    },
  );

  it('normalizes resolved-state case and surrounding whitespace', () => {
    const input = [{ id: 'a', status: 'Resolved' }, { id: 'b', status: '  resolved  ' }, { id: 'c', status: 'RESOLVED' }];
    const result = partitionIncidents(input);
    expect(result.active).toEqual([]);
    expect(result.past).toHaveLength(3);
  });

  it('treats a missing status/state field as active rather than throwing', () => {
    const input = [{ id: 'no-status' }];
    expect(partitionIncidents(input)).toEqual({ active: [{ id: 'no-status' }], past: [] });
  });

  it('throws a clear error for non-array input instead of silently coercing', () => {
    expect(() => partitionIncidents(null)).toThrow(TypeError);
    expect(() => partitionIncidents(undefined)).toThrow(TypeError);
    expect(() => partitionIncidents('not-an-array')).toThrow(TypeError);
    expect(() => partitionIncidents({ id: 1, status: 'open' })).toThrow(TypeError);
  });

  it('does not mutate the input array or its elements', () => {
    const input = [
      { id: 1, status: 'open' },
      { id: 2, status: 'resolved' },
    ];
    const inputCopy = JSON.parse(JSON.stringify(input));
    partitionIncidents(input);
    expect(input).toEqual(inputCopy);
  });

  it('reflects a resolve transition on the very next call, with no caching or delay', () => {
    const incident = { id: 'inc-live', status: 'investigating' };
    const incidents = [incident];

    const before = partitionIncidents(incidents);
    expect(before.active).toEqual([{ id: 'inc-live', status: 'investigating' }]);
    expect(before.past).toEqual([]);

    incidents[0] = { ...incident, status: 'resolved' };

    const after = partitionIncidents(incidents);
    expect(after.active).toEqual([]);
    expect(after.past).toEqual([{ id: 'inc-live', status: 'resolved' }]);
  });

  it('preserves relative input order within each partition rather than resorting', () => {
    const input = [
      { id: 3, status: 'resolved' },
      { id: 1, status: 'open' },
      { id: 4, status: 'resolved' },
      { id: 2, status: 'investigating' },
    ];
    const result = partitionIncidents(input);
    expect(result.active.map((i) => i.id)).toEqual([1, 2]);
    expect(result.past.map((i) => i.id)).toEqual([3, 4]);
  });
});
