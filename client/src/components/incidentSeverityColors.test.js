import { describe, it, expect } from 'vitest';
import { getIncidentSeverityColor } from './incidentSeverityColors.js';
import { colors } from '../theme/statusPageTokens.js';

describe('getIncidentSeverityColor', () => {
  it.each([
    ['SEV1', colors.sev1],
    ['SEV2', colors.sev2],
    ['SEV3', colors.sev3],
    ['critical', colors.sev1],
    ['major', colors.sev2],
    ['minor', colors.sev3],
  ])('maps severity "%s" to %s', (severity, expected) => {
    expect(getIncidentSeverityColor(severity)).toBe(expected);
  });

  it('falls back to a neutral color for an unrecognized severity, not a severity hue', () => {
    const color = getIncidentSeverityColor('not-a-severity');
    expect(color).toBe(colors.textMutedLight);
    expect([colors.sev1, colors.sev2, colors.sev3]).not.toContain(color);
  });
});
