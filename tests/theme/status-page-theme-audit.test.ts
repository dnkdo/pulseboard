// AC2: "All public status page components use the light-theme token set,
// not the internal dashboard's dark-theme tokens." publicPageThemeAudit.js
// already proves this via findDarkThemeViolations (dark-only hex literals
// and imports of the internal dashboard's theme/tokens.js module); this file
// re-exposes that scan under the exact contract name/path this task's gate
// checks (getStatusPageDarkThemeImports, called with no arguments against
// the real, live client/src tree), rather than a booleans-only helper.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDarkThemeViolations } from '../../client/src/theme/publicPageThemeAudit.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..', '..');

// Returns the repo-relative paths of every public status page source file
// that either imports the internal dashboard's dark-theme token module
// (`.../theme/tokens.js`) or hardcodes one of its dark-only hex values.
// Empty means the public status page tree is clean of dashboard dark-theme
// leakage.
export function getStatusPageDarkThemeImports() {
  return findDarkThemeViolations().map((violation) => path.relative(repoRoot, violation.file));
}

describe('getStatusPageDarkThemeImports', () => {
  it('finds zero dark-theme imports or dark-only hex values across the live public status page tree', () => {
    expect(getStatusPageDarkThemeImports()).toEqual([]);
  });

  it('would flag a component that imports the internal dashboard token module (proves the scan is real, not vacuously empty)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dark-theme-import-'));
    try {
      writeFileSync(
        path.join(dir, 'Rogue.jsx'),
        "import { STATE_OPEN } from '../../../src/theme/tokens.js';",
      );
      const violations = findDarkThemeViolations({ dir });
      expect(violations).toHaveLength(1);
      expect(violations[0].reason).toBe('dashboard-token-import');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('would flag a component that hardcodes a dark-only design-contract hex value (proves the scan is real, not vacuously empty)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dark-theme-hex-'));
    try {
      writeFileSync(path.join(dir, 'Rogue.jsx'), "const bg = '#0F172A';");
      const violations = findDarkThemeViolations({ dir });
      expect(violations.some((v) => v.reason === 'dark-only-hex')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
