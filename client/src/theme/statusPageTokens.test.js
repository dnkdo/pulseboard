import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, SEVERITY_COLOR_KEYS } from './statusPageTokens.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const designTokens = JSON.parse(
  readFileSync(path.resolve(moduleDir, '../../../.adlc/design/tokens.json'), 'utf-8'),
);

describe('statusPageTokens.colors', () => {
  it('mirrors the severity colors from the design contract', () => {
    expect(colors.sev1).toBe(designTokens.colors.sev1);
    expect(colors.sev2).toBe(designTokens.colors.sev2);
    expect(colors.sev3).toBe(designTokens.colors.sev3);
  });

  it('mirrors the light-theme surface/text/border colors from the design contract', () => {
    expect(colors.surfacePrimaryLight).toBe(designTokens.colors['surface-primary-light']);
    expect(colors.surfaceSecondaryLight).toBe(designTokens.colors['surface-secondary-light']);
    expect(colors.surfaceTertiaryLight).toBe(designTokens.colors['surface-tertiary-light']);
    expect(colors.textPrimaryLight).toBe(designTokens.colors['text-primary-light']);
    expect(colors.textSecondaryLight).toBe(designTokens.colors['text-secondary-light']);
    expect(colors.textMutedLight).toBe(designTokens.colors['text-muted-light']);
    expect(colors.borderLight).toBe(designTokens.colors['border-light']);
  });

  it('mirrors the shared status colors from the design contract', () => {
    expect(colors.statusOperational).toBe(designTokens.colors['status-operational']);
    expect(colors.statusInvestigating).toBe(designTokens.colors['status-investigating']);
  });

  it('keys surface/text/border colors to the "-light" design-contract entries, never the "-dark" ones', () => {
    // Some dark/light pairs in tokens.json coincidentally share a hex value
    // (e.g. text-muted-dark === text-muted-light), so this asserts each key
    // reads from its named "-light" source rather than diffing raw hex.
    const themedKeys = {
      surfacePrimaryLight: 'surface-primary-light',
      surfaceSecondaryLight: 'surface-secondary-light',
      surfaceTertiaryLight: 'surface-tertiary-light',
      textPrimaryLight: 'text-primary-light',
      textSecondaryLight: 'text-secondary-light',
      textMutedLight: 'text-muted-light',
      borderLight: 'border-light',
    };
    for (const [tokenKey, designKey] of Object.entries(themedKeys)) {
      expect(colors[tokenKey]).toBe(designTokens.colors[designKey]);
    }
  });

  it('exposes the three severity color keys for scope checks', () => {
    expect(SEVERITY_COLOR_KEYS).toEqual(['sev1', 'sev2', 'sev3']);
  });
});
