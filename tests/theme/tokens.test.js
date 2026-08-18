import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { darkTheme } from '../../src/theme/tokens.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const designTokens = JSON.parse(readFileSync(path.join(repoRoot, '.adlc/design/tokens.json'), 'utf-8'));

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$|^rgb\(|^hsl\(/;

describe('darkTheme', () => {
  it('is exported as a plain object', () => {
    expect(typeof darkTheme).toBe('object');
    expect(darkTheme).not.toBeNull();
  });

  it('exports background, surface, and text as non-empty valid color strings', () => {
    for (const key of ['background', 'surface', 'text']) {
      expect(typeof darkTheme[key]).toBe('string');
      expect(darkTheme[key].length).toBeGreaterThan(0);
      expect(darkTheme[key]).toMatch(COLOR_PATTERN);
    }
  });

  it('exports border and muted/secondary text scales used by dashboard components', () => {
    for (const key of ['surfaceRaised', 'textSecondary', 'textMuted', 'border']) {
      expect(typeof darkTheme[key]).toBe('string');
      expect(darkTheme[key]).toMatch(COLOR_PATTERN);
    }
  });

  it('matches the *-dark color values in the Figma-derived design token spec', () => {
    expect(darkTheme.background).toBe(designTokens.colors['surface-primary-dark']);
    expect(darkTheme.surface).toBe(designTokens.colors['surface-secondary-dark']);
    expect(darkTheme.surfaceRaised).toBe(designTokens.colors['surface-tertiary-dark']);
    expect(darkTheme.text).toBe(designTokens.colors['text-primary-dark']);
    expect(darkTheme.textSecondary).toBe(designTokens.colors['text-secondary-dark']);
    expect(darkTheme.textMuted).toBe(designTokens.colors['text-muted-dark']);
    expect(darkTheme.border).toBe(designTokens.colors['border-dark']);
  });

  it('is frozen so components cannot mutate the shared token object', () => {
    expect(Object.isFrozen(darkTheme)).toBe(true);
    expect(() => {
      darkTheme.background = '#000000';
    }).toThrow();
  });
});
