// AC1: "No SEV1/SEV2/SEV3 color token is applied to any non-severity UI
// element on the public status page." severityAudit.js already proves this
// via findSeverityTokenViolations (a raw SEV1/SEV2/SEV3 hex outside the
// approved severity-indicator files); this file re-exposes that scan under
// the exact contract name/path this task's gate checks
// (findSeverityTokensOutsideSeverityComponents, called with no arguments
// against the real, live client/src tree).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findSeverityTokenViolations } from '../../client/src/theme/severityAudit.js';

// Returns [{ file, hex }] for every public status page source file, outside
// SeverityBadge.jsx and its color-mapping module, that contains a raw
// SEV1/SEV2/SEV3 hex literal. Empty means no non-severity UI element is
// using a severity color.
export function findSeverityTokensOutsideSeverityComponents() {
  return findSeverityTokenViolations();
}

describe('findSeverityTokensOutsideSeverityComponents', () => {
  it('finds zero severity-color usages outside the approved severity-indicator files', () => {
    expect(findSeverityTokensOutsideSeverityComponents()).toEqual([]);
  });

  it('would flag a non-severity component that reintroduces a raw severity hex (proves the scan is real, not vacuously empty)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-usage-'));
    try {
      writeFileSync(path.join(dir, 'HealthTile.jsx'), "const bg = '#EF4444';");
      const violations = findSeverityTokenViolations({ dir });
      expect(violations).toHaveLength(1);
      expect(violations[0].hex).toBe('#EF4444');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still allows the designated SeverityBadge.jsx file to reference a raw severity hex', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-usage-allowed-'));
    try {
      writeFileSync(path.join(dir, 'SeverityBadge.jsx'), "const bg = '#EF4444';");
      expect(findSeverityTokenViolations({ dir })).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
