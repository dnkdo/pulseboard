import { describe, it, expect } from 'vitest';
import { getIncidentStatusColor } from './incidentStatusColors.js';
import { colors } from '../theme/statusPageTokens.js';

describe('getIncidentStatusColor', () => {
  it.each([
    ['open', colors.textMutedLight],
    ['active', colors.textMutedLight],
    ['investigating', colors.statusInvestigating],
    ['identified', colors.textSecondaryLight],
  ])('maps status "%s" to %s', (status, expected) => {
    expect(getIncidentStatusColor(status)).toBe(expected);
  });

  it('never uses a hardcoded hex outside the token set (e.g. the old gray-500 #6B7280)', () => {
    const tokenValues = Object.values(colors);
    for (const status of ['open', 'active', 'investigating', 'identified', 'anything-else']) {
      expect(tokenValues).toContain(getIncidentStatusColor(status));
    }
    expect(getIncidentStatusColor('open')).not.toBe('#6B7280');
  });

  it('falls back to a neutral color, not a severity hue, for an unrecognized status', () => {
    const color = getIncidentStatusColor('not-a-status');
    expect(color).toBe(colors.textMutedLight);
    expect([colors.sev1, colors.sev2, colors.sev3]).not.toContain(color);
  });
});
