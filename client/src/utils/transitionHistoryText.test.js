import { describe, it, expect } from 'vitest';
import {
  EMPTY_MESSAGE,
  transitionLabel,
  transitionTimestampValue,
  formatTransitionHistoryText,
} from './transitionHistoryText.js';

describe('transitionLabel', () => {
  it('prefers stateLabel over label and state', () => {
    expect(transitionLabel({ state: 'x', label: 'Label', stateLabel: 'StateLabel' })).toBe('StateLabel');
  });

  it('falls back to label when stateLabel is absent', () => {
    expect(transitionLabel({ state: 'x', label: 'Label' })).toBe('Label');
  });

  it('falls back to the raw state when neither stateLabel nor label is present', () => {
    expect(transitionLabel({ state: 'identified' })).toBe('identified');
  });

  it('falls back to "Unknown" when no label-bearing field is present', () => {
    expect(transitionLabel({})).toBe('Unknown');
  });

  it('ignores empty-string stateLabel/label and falls through to state', () => {
    expect(transitionLabel({ stateLabel: '', label: '', state: 'open' })).toBe('open');
  });
});

describe('transitionTimestampValue', () => {
  it('prefers timestamp over occurredAt', () => {
    expect(transitionTimestampValue({ timestamp: 'a', occurredAt: 'b' })).toBe('a');
  });

  it('falls back to occurredAt when timestamp is absent', () => {
    expect(transitionTimestampValue({ occurredAt: 'b' })).toBe('b');
  });
});

describe('formatTransitionHistoryText', () => {
  it('returns the empty-state message for a zero-length array', () => {
    expect(formatTransitionHistoryText([])).toBe(EMPTY_MESSAGE);
  });

  it('returns the empty-state message for non-array input', () => {
    expect(formatTransitionHistoryText(undefined)).toBe(EMPTY_MESSAGE);
  });

  it('joins one formatted row per transition, in input order', () => {
    const out = formatTransitionHistoryText([
      { state: 'triggered', timestamp: '2026-08-18T10:30:00Z' },
      { state: 'resolved', timestamp: '2026-08-18T12:00:00Z' },
    ]);
    expect(out).toBe('triggered 2026-Aug-18, 10:30 AM | resolved 2026-Aug-18, 12:00 PM');
  });
});
