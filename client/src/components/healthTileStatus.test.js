import { describe, it, expect } from 'vitest';
import { getHealthTileStatusMeta } from './healthTileStatus.js';
import { colors } from '../theme/statusPageTokens.js';

const SEVERITY_HEX = [colors.sev1, colors.sev2, colors.sev3];

describe('getHealthTileStatusMeta', () => {
  it('returns the operational label and the status-operational token', () => {
    expect(getHealthTileStatusMeta('operational')).toEqual({
      label: 'Operational',
      color: colors.statusOperational,
    });
  });

  it.each(['degraded', 'partial_outage', 'major_outage'])(
    'AC1: never colors "%s" with a SEV1/SEV2/SEV3 severity token',
    (status) => {
      const meta = getHealthTileStatusMeta(status);
      expect(SEVERITY_HEX).not.toContain(meta.color);
    },
  );

  it('gives each non-operational status a distinct label and color from the others', () => {
    const statuses = ['operational', 'degraded', 'partial_outage', 'major_outage'];
    const metas = statuses.map(getHealthTileStatusMeta);
    const labels = new Set(metas.map((m) => m.label));
    const colorValues = new Set(metas.map((m) => m.color));
    expect(labels.size).toBe(statuses.length);
    expect(colorValues.size).toBe(statuses.length);
  });

  it('falls back to a neutral Unknown meta, not a severity color, for an unrecognized status', () => {
    const meta = getHealthTileStatusMeta('not_a_real_status');
    expect(meta).toEqual({ label: 'Unknown', color: colors.textMutedLight });
    expect(SEVERITY_HEX).not.toContain(meta.color);
  });
});
