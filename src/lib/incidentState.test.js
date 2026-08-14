import { describe, it, expect } from 'vitest';
import { isValidTransition, getNextState } from './incidentState.js';

describe('isValidTransition', () => {
  it('allows the immediate next state', () => {
    expect(isValidTransition('open', 'investigating')).toBe(true);
    expect(isValidTransition('investigating', 'identified')).toBe(true);
    expect(isValidTransition('identified', 'resolved')).toBe(true);
  });

  it('rejects a skipped state', () => {
    expect(isValidTransition('open', 'identified')).toBe(false);
    expect(isValidTransition('open', 'resolved')).toBe(false);
  });

  it('rejects reopening a resolved incident', () => {
    expect(isValidTransition('resolved', 'investigating')).toBe(false);
  });

  it('rejects moving backwards', () => {
    expect(isValidTransition('identified', 'investigating')).toBe(false);
  });

  it('rejects unknown states on either side', () => {
    expect(isValidTransition('open', 'archived')).toBe(false);
    expect(isValidTransition('archived', 'open')).toBe(false);
  });
});

describe('getNextState', () => {
  it('returns the next state in sequence', () => {
    expect(getNextState('open')).toBe('investigating');
    expect(getNextState('investigating')).toBe('identified');
    expect(getNextState('identified')).toBe('resolved');
  });

  it('returns null for a resolved (terminal) incident', () => {
    expect(getNextState('resolved')).toBeNull();
  });

  it('returns null for an unknown state', () => {
    expect(getNextState('archived')).toBeNull();
  });
});
