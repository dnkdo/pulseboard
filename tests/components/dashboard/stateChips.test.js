import { describe, it, expect } from 'vitest';
import { getStateChipProps } from '../../../src/components/dashboard/stateChips.js';
import {
  STATE_OPEN,
  STATE_INVESTIGATING,
  STATE_IDENTIFIED,
  STATE_RESOLVED,
  SEV1_COLOR,
  SEV2_COLOR,
  SEV3_COLOR,
} from '../../../src/theme/tokens.js';

describe('getStateChipProps', () => {
  it.each([
    ['open', 'Open', STATE_OPEN],
    ['investigating', 'Investigating', STATE_INVESTIGATING],
    ['identified', 'Identified', STATE_IDENTIFIED],
    ['resolved', 'Resolved', STATE_RESOLVED],
  ])('returns the correct label and token for "%s"', (state, expectedLabel, expectedToken) => {
    const { label, token } = getStateChipProps(state);
    expect(label).toBe(expectedLabel);
    expect(token).toBe(expectedToken);
  });

  it('matches the .adlc test-contract case: "investigating" maps to the "Investigating" label', () => {
    expect(getStateChipProps('investigating')).toMatchObject({ label: 'Investigating' });
  });

  it('matches the .adlc test-contract case: "resolved" maps to the "Resolved" label', () => {
    expect(getStateChipProps('resolved')).toMatchObject({ label: 'Resolved' });
  });

  it('never reuses a SEV1/SEV2/SEV3 severity color token for chip styling', () => {
    const stateTokens = new Set(
      ['open', 'investigating', 'identified', 'resolved'].map((state) => getStateChipProps(state).token)
    );
    const severityTokens = new Set([SEV1_COLOR, SEV2_COLOR, SEV3_COLOR]);

    for (const token of stateTokens) {
      expect(severityTokens.has(token)).toBe(false);
    }
  });

  it('returns four distinct tokens, one per state', () => {
    const tokens = new Set(
      ['open', 'investigating', 'identified', 'resolved'].map((state) => getStateChipProps(state).token)
    );
    expect(tokens.size).toBe(4);
  });

  it('throws a descriptive error for an unknown state rather than a fallback chip', () => {
    expect(() => getStateChipProps('closed')).toThrow(/unknown state/i);
    expect(() => getStateChipProps('SEV1')).toThrow(/unknown state/i);
  });

  it('throws for missing/undefined/null state', () => {
    expect(() => getStateChipProps(undefined)).toThrow();
    expect(() => getStateChipProps(null)).toThrow();
    expect(() => getStateChipProps('')).toThrow();
  });

  it('returns a frozen props object so callers cannot mutate the shared token map', () => {
    const props = getStateChipProps('open');
    expect(() => {
      props.label = 'Tampered';
    }).toThrow();
  });
});
