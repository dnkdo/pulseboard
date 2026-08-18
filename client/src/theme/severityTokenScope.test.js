// AC1: "No SEV1/SEV2/SEV3 color token is applied to any non-severity UI
// element on the public status page." scripts/color-usage-audit.js only
// scans the repo-root src/ tree (the internal dashboard), never client/src/,
// so severityAudit.js provides the equivalent static-scan guarantee for the
// public status page surface this task modifies — this file exercises it.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { colors } from './statusPageTokens.js';
import { findSeverityTokenViolations, validateSeverityTokenUsage } from './severityAudit.js';

const scratchDirs = [];
afterEach(() => {
  while (scratchDirs.length > 0) {
    rmSync(scratchDirs.pop(), { recursive: true, force: true });
  }
});

describe('public status page severity color scope (client/src)', () => {
  it('finds no severity hex literal outside the approved severity-indicator modules', () => {
    expect(findSeverityTokenViolations()).toEqual([]);
  });

  it('validateSeverityTokenUsage returns true for the real, live client/src tree', () => {
    expect(validateSeverityTokenUsage()).toBe(true);
  });

  it('would fail if a component reintroduced a raw severity hex (proves the scan is real)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-scope-'));
    scratchDirs.push(dir);
    writeFileSync(path.join(dir, 'HealthTile.jsx'), `const bg = '${colors.sev1}';`);

    expect(findSeverityTokenViolations({ dir })).toHaveLength(1);
    expect(validateSeverityTokenUsage({ dir })).toBe(false);
  });

  it('still allows the designated severity-indicator files to reference the raw hex', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-scope-'));
    scratchDirs.push(dir);
    writeFileSync(path.join(dir, 'SeverityBadge.jsx'), `const bg = '${colors.sev1}';`);

    expect(findSeverityTokenViolations({ dir })).toEqual([]);
    expect(validateSeverityTokenUsage({ dir })).toBe(true);
  });
});
