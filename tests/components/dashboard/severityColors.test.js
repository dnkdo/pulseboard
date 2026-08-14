import { describe, it, expect } from 'vitest';
import { getSeverityColor } from '../../../src/components/dashboard/severityColors.js';
import {
  SEV1_COLOR,
  SEV2_COLOR,
  SEV3_COLOR,
  NEUTRAL_SEVERITY_COLOR,
  STATE_OPEN,
  STATE_INVESTIGATING,
  STATE_IDENTIFIED,
  STATE_RESOLVED,
} from '../../../src/theme/tokens.js';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe('getSeverityColor', () => {
  it.each([
    ['SEV1', SEV1_COLOR],
    ['SEV2', SEV2_COLOR],
    ['SEV3', SEV3_COLOR],
  ])('returns the %s design token color', (severity, expectedColor) => {
    expect(getSeverityColor(severity)).toBe(expectedColor);
  });

  it('matches the .adlc test-contract case: SEV1 resolves to a valid hex color', () => {
    expect(getSeverityColor('SEV1')).toMatch(HEX_PATTERN);
  });

  it.each(['SEV1', 'SEV2', 'SEV3'])('returns a valid 6-digit hex color for %s', (severity) => {
    expect(getSeverityColor(severity)).toMatch(HEX_PATTERN);
  });

  it('returns three distinct colors, one per severity', () => {
    const colors = new Set(['SEV1', 'SEV2', 'SEV3'].map(getSeverityColor));
    expect(colors.size).toBe(3);
  });

  it('falls back to the neutral token for an unknown severity instead of throwing', () => {
    expect(() => getSeverityColor('SEV4')).not.toThrow();
    expect(getSeverityColor('SEV4')).toBe(NEUTRAL_SEVERITY_COLOR);
    expect(getSeverityColor('SEV4')).toMatch(HEX_PATTERN);
  });

  it('falls back to the neutral token for missing/undefined/null/empty severity', () => {
    expect(getSeverityColor(undefined)).toBe(NEUTRAL_SEVERITY_COLOR);
    expect(getSeverityColor(null)).toBe(NEUTRAL_SEVERITY_COLOR);
    expect(getSeverityColor('')).toBe(NEUTRAL_SEVERITY_COLOR);
  });

  it('never reuses a state-chip token for a real severity color', () => {
    const severityColors = new Set(['SEV1', 'SEV2', 'SEV3'].map(getSeverityColor));
    const stateTokens = [STATE_OPEN, STATE_INVESTIGATING, STATE_IDENTIFIED, STATE_RESOLVED];
    for (const token of stateTokens) {
      expect(severityColors.has(token)).toBe(false);
    }
  });
});
