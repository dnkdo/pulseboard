import { describe, it, expect } from 'vitest';
import { filterIncidentsByComponent } from '../../src/lib/filters.js';

describe('filterIncidentsByComponent', () => {
  it('matches the .adlc test-contract case: returns only incidents referencing the given component ID', () => {
    const input = [
      { id: 'inc-1', componentId: 'comp-1' },
      { id: 'inc-2', componentId: 'comp-2' },
      { id: 'inc-3', componentId: 'comp-1' },
    ];
    expect(filterIncidentsByComponent(input, 'comp-1')).toEqual([
      { id: 'inc-1', componentId: 'comp-1' },
      { id: 'inc-3', componentId: 'comp-1' },
    ]);
  });

  it("matches the .adlc test-contract case: 'all' selector returns the full unfiltered incident list", () => {
    const input = [
      { id: '1', componentId: 'comp-a' },
      { id: '2', componentId: 'comp-b' },
    ];
    expect(filterIncidentsByComponent(input, 'all')).toEqual([
      { id: '1', componentId: 'comp-a' },
      { id: '2', componentId: 'comp-b' },
    ]);
  });

  it('treats a null/undefined componentId the same as "all" rather than filtering everything out', () => {
    const input = [
      { id: '1', componentId: 'comp-a' },
      { id: '2', componentId: 'comp-b' },
    ];
    expect(filterIncidentsByComponent(input, null)).toEqual(input);
    expect(filterIncidentsByComponent(input, undefined)).toEqual(input);
  });

  it('returns an empty array for an empty incident list, regardless of selector', () => {
    expect(filterIncidentsByComponent([], 'comp-1')).toEqual([]);
    expect(filterIncidentsByComponent([], 'all')).toEqual([]);
  });

  it('returns an empty array when no incident references the given (unknown) component id', () => {
    const input = [
      { id: '1', componentId: 'comp-a' },
      { id: '2', componentId: 'comp-b' },
    ];
    expect(filterIncidentsByComponent(input, 'comp-does-not-exist')).toEqual([]);
  });

  it('returns an empty array for non-array input rather than throwing', () => {
    expect(filterIncidentsByComponent(null, 'comp-1')).toEqual([]);
    expect(filterIncidentsByComponent(undefined, 'comp-1')).toEqual([]);
  });

  it('does not mutate the input array or its elements', () => {
    const input = [
      { id: '1', componentId: 'comp-a' },
      { id: '2', componentId: 'comp-b' },
    ];
    const inputCopy = JSON.parse(JSON.stringify(input));
    filterIncidentsByComponent(input, 'comp-a');
    filterIncidentsByComponent(input, 'all');
    expect(input).toEqual(inputCopy);
  });

  it('returns a new array reference for the "all" selector, not the same array instance', () => {
    const input = [{ id: '1', componentId: 'comp-a' }];
    expect(filterIncidentsByComponent(input, 'all')).not.toBe(input);
  });

  it('also matches the DB-column spelling `component_id` for seeded rows', () => {
    const input = [
      { id: 'seed-inc-1', component_id: 'seed-comp-api' },
      { id: 'seed-inc-2', component_id: 'seed-comp-web' },
    ];
    expect(filterIncidentsByComponent(input, 'seed-comp-api')).toEqual([
      { id: 'seed-inc-1', component_id: 'seed-comp-api' },
    ]);
  });

  it('also matches the API-response shape `affectedComponents` array', () => {
    const input = [
      { id: 'api-inc-1', affectedComponents: ['api', 'web'] },
      { id: 'api-inc-2', affectedComponents: ['db'] },
    ];
    expect(filterIncidentsByComponent(input, 'web')).toEqual([
      { id: 'api-inc-1', affectedComponents: ['api', 'web'] },
    ]);
  });
});
