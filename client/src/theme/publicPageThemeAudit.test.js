import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  DARK_ONLY_HEX,
  computeDarkOnlyHex,
  findDarkThemeViolations,
  validateNoDarkThemeUsage,
  discoverStatusPageComponentFiles,
  REPO_ROOT,
} from './publicPageThemeAudit.js';

const scratchDirs = [];
afterEach(() => {
  while (scratchDirs.length > 0) {
    rmSync(scratchDirs.pop(), { recursive: true, force: true });
  }
});

function makeScratchDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'dark-theme-scope-'));
  scratchDirs.push(dir);
  return dir;
}

describe('DARK_ONLY_HEX', () => {
  it('contains exactly the design-contract dark tokens with no light-token hex collision', () => {
    // surface-primary-dark, surface-tertiary-dark, and text-secondary-dark
    // are the only "-dark" entries in .adlc/design/tokens.json whose hex
    // isn't coincidentally reused by a "-light" (or shared) entry.
    expect([...DARK_ONLY_HEX].sort()).toEqual(['#0F172A', '#334155', '#CBD5E1'].sort());
  });

  it('excludes dark tokens that coincidentally share a hex with a light token', () => {
    // surface-secondary-dark/text-primary-light both resolve to #1E293B, and
    // border-dark/text-secondary-light both resolve to #475569 — neither can
    // prove "this is dark theme" by hex alone, so both are excluded.
    expect(DARK_ONLY_HEX).not.toContain('#1E293B');
    expect(DARK_ONLY_HEX).not.toContain('#475569');
    expect(DARK_ONLY_HEX).not.toContain('#94A3B8');
  });
});

describe('computeDarkOnlyHex error paths', () => {
  it('returns an empty list rather than throwing when tokens.json has no colors block', () => {
    expect(computeDarkOnlyHex(undefined)).toEqual([]);
    expect(computeDarkOnlyHex(null)).toEqual([]);
  });

  it('returns an empty list rather than throwing when colors is malformed (not an object)', () => {
    expect(computeDarkOnlyHex('not-an-object')).toEqual([]);
    expect(computeDarkOnlyHex(42)).toEqual([]);
  });

  it('returns an empty list when colors has no "-dark" entries at all', () => {
    expect(computeDarkOnlyHex({ 'surface-primary-light': '#FFFFFF' })).toEqual([]);
  });

  it('still computes dark-only hexes correctly given a well-formed partial colors block', () => {
    expect(
      computeDarkOnlyHex({
        'surface-primary-dark': '#0F172A',
        'text-muted-dark': '#94A3B8',
        'text-muted-light': '#94A3B8',
      }),
    ).toEqual(['#0F172A']);
  });
});

describe('findDarkThemeViolations / validateNoDarkThemeUsage', () => {
  it('finds no dark-only hex or dashboard-token import in the real, live client/src tree', () => {
    expect(findDarkThemeViolations()).toEqual([]);
    expect(validateNoDarkThemeUsage()).toBe(true);
  });

  it('flags a component that reintroduces a dark-only hex literal', () => {
    const dir = makeScratchDir();
    writeFileSync(path.join(dir, 'SomeCard.jsx'), "const bg = '#0F172A';");

    const violations = findDarkThemeViolations({ dir });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ hex: '#0F172A', reason: 'dark-only-hex' });
    expect(validateNoDarkThemeUsage({ dir })).toBe(false);
  });

  it('flags a component that imports the internal dashboard token module', () => {
    const dir = makeScratchDir();
    writeFileSync(
      path.join(dir, 'SomeCard.jsx'),
      "import { STATE_OPEN } from '../../theme/tokens.js';",
    );

    const violations = findDarkThemeViolations({ dir });
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toBe('dashboard-token-import');
  });

  it('does not flag a dark-only hex that appears only inside a comment', () => {
    const dir = makeScratchDir();
    writeFileSync(
      path.join(dir, 'SomeCard.jsx'),
      "// The dashboard's dark surface is #0F172A, unlike this page's white background\nconst bg = '#FFFFFF';",
    );

    expect(findDarkThemeViolations({ dir })).toEqual([]);
  });

  it('does not flag a bare textual mention of the dashboard token module path outside an import statement', () => {
    const dir = makeScratchDir();
    writeFileSync(
      path.join(dir, 'SomeCard.jsx'),
      '// Deliberately does not import src/theme/tokens.js — see CLAUDE.md\nexport default function SomeCard() { return null; }',
    );

    expect(findDarkThemeViolations({ dir })).toEqual([]);
  });
});

describe('discoverStatusPageComponentFiles', () => {
  it('discovers exactly the .jsx components transitively reachable from StatusPage.jsx', () => {
    const discovered = discoverStatusPageComponentFiles();
    const relative = new Set(
      [...discovered].map((f) => path.relative(REPO_ROOT, f).split(path.sep).join('/')),
    );

    expect(relative).toEqual(
      new Set([
        'client/src/components/StatusPageHeader.jsx',
        'client/src/components/StatusBanner.jsx',
        'client/src/components/ComponentHealthGrid.jsx',
        'client/src/components/HealthTile.jsx',
        'client/src/components/ActiveIncidentsList.jsx',
        'client/src/components/IncidentCard.jsx',
        'client/src/components/PastIncidentsList.jsx',
        'client/src/components/SeverityBadge.jsx',
      ]),
    );
  });

  it('discovers nothing beyond StatusPage.jsx itself for an entry file with no local imports', () => {
    const dir = makeScratchDir();
    const entryFile = path.join(dir, 'Empty.jsx');
    writeFileSync(entryFile, 'export default function Empty() { return null; }');

    expect(discoverStatusPageComponentFiles({ entryFile })).toEqual(new Set());
  });
});
