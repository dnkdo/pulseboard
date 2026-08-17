import { describe, it, expect } from 'vitest';
import { hasStatusStateChanged } from './diffStatusState.js';

describe('hasStatusStateChanged', () => {
  it('reports no change for two structurally identical arrays', () => {
    const prev = [
      { id: '1', status: 'open' },
      { id: '2', status: 'resolved' },
    ];
    const next = [
      { id: '1', status: 'open' },
      { id: '2', status: 'resolved' },
    ];
    expect(hasStatusStateChanged(prev, next)).toBe(false);
  });

  it('reports no change when only the ordering of the same items differs', () => {
    const prev = [
      { id: '1', status: 'open' },
      { id: '2', status: 'resolved' },
    ];
    const next = [
      { id: '2', status: 'resolved' },
      { id: '1', status: 'open' },
    ];
    expect(hasStatusStateChanged(prev, next)).toBe(false);
  });

  it('reports a change when an incident status field flips, e.g. investigating to resolved', () => {
    const prev = [{ id: '1', status: 'investigating' }];
    const next = [{ id: '1', status: 'resolved' }];
    expect(hasStatusStateChanged(prev, next)).toBe(true);
  });

  it('reports a change when a component healthState field flips', () => {
    const prev = [{ id: 'api', healthState: 'operational' }];
    const next = [{ id: 'api', healthState: 'major_outage' }];
    expect(hasStatusStateChanged(prev, next)).toBe(true);
  });

  it('reports a change when an item is added to the list', () => {
    const prev = [{ id: '1', status: 'open' }];
    const next = [
      { id: '1', status: 'open' },
      { id: '2', status: 'open' },
    ];
    expect(hasStatusStateChanged(prev, next)).toBe(true);
  });

  it('reports a change when an item is removed from the list', () => {
    const prev = [
      { id: '1', status: 'open' },
      { id: '2', status: 'open' },
    ];
    const next = [{ id: '1', status: 'open' }];
    expect(hasStatusStateChanged(prev, next)).toBe(true);
  });

  it('treats the initial undefined snapshot as changed once real data arrives, for cold-start seeding', () => {
    expect(hasStatusStateChanged(undefined, [])).toBe(true);
    expect(hasStatusStateChanged(undefined, [{ id: '1' }])).toBe(true);
  });

  it('reports no change between two empty arrays', () => {
    expect(hasStatusStateChanged([], [])).toBe(false);
  });

  it('handles plain (non-array) objects with a straight structural comparison', () => {
    expect(
      hasStatusStateChanged({ overallStatus: 'operational' }, { overallStatus: 'operational' }),
    ).toBe(false);
    expect(
      hasStatusStateChanged({ overallStatus: 'operational' }, { overallStatus: 'degraded' }),
    ).toBe(true);
  });
});
