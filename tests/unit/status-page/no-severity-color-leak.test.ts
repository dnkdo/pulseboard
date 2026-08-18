// AC1: "No SEV1/SEV2/SEV3 color token is applied to any non-severity UI
// element on the public status page." severityAudit.js / severityTokenScope
// test.js prove this for the whole client/src tree at once; this module
// proves the same rule per-file, against a single source path (repo-root
// relative or absolute) — useful for checking one changed file in isolation
// instead of always re-scanning the whole tree.
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, SEVERITY_COLOR_KEYS } from '../../../client/src/theme/statusPageTokens.js';
import { stripComments } from '../../../client/src/theme/sourceScanUtils.js';
import { DEFAULT_ALLOWED_FILES } from '../../../client/src/theme/severityAudit.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..', '..', '..');
const SEVERITY_HEX_VALUES = Object.freeze(SEVERITY_COLOR_KEYS.map((key) => colors[key]));

// Returns [{ file, hex }] for the file at `filePath` (repo-root relative or
// absolute) if it contains a raw SEV1/SEV2/SEV3 hex literal outside a
// comment and isn't one of the approved severity-indicator files. A path
// that doesn't exist on disk has nothing to scan, so it trivially has no
// violations rather than throwing.
export function findSeverityColorViolations(filePath, { allowedFiles = DEFAULT_ALLOWED_FILES } = {}) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  if (!existsSync(resolved) || new Set(allowedFiles).has(path.basename(resolved))) {
    return [];
  }
  const contents = stripComments(readFileSync(resolved, 'utf-8'), path.extname(resolved)).toUpperCase();
  const violations = [];
  for (const hex of SEVERITY_HEX_VALUES) {
    if (contents.includes(hex.toUpperCase())) {
      violations.push({ file: resolved, hex });
    }
  }
  return violations;
}

const scratchDirs = [];
afterEach(() => {
  while (scratchDirs.length > 0) {
    rmSync(scratchDirs.pop(), { recursive: true, force: true });
  }
});

function scratchFile(name, contents) {
  const dir = mkdtempSync(path.join(tmpdir(), 'severity-color-leak-'));
  scratchDirs.push(dir);
  const filePath = path.join(dir, name);
  writeFileSync(filePath, contents);
  return filePath;
}

describe('findSeverityColorViolations', () => {
  it('returns no violations for a path that does not exist on disk', () => {
    // client/src/components/StatusPage/Header.tsx is not a real file in this
    // repo (the public status page header lives at
    // client/src/components/StatusPageHeader.jsx) — nothing to scan means
    // nothing to flag.
    expect(findSeverityColorViolations('client/src/components/StatusPage/Header.tsx')).toEqual([]);
  });

  it('flags a non-severity component that reintroduces a raw severity hex', () => {
    const file = scratchFile('HealthTile.jsx', `const bg = '${colors.sev1}';`);

    const violations = findSeverityColorViolations(file);

    expect(violations).toEqual([{ file, hex: colors.sev1 }]);
  });

  it('does not flag a severity hex that appears only inside a comment', () => {
    const file = scratchFile(
      'HealthTile.jsx',
      `// token: colors.sev1 (red) is reserved for severity indicators\nconst bg = '#FFFFFF';`,
    );

    expect(findSeverityColorViolations(file)).toEqual([]);
  });

  it('allows the designated severity-indicator file to reference the raw hex', () => {
    const file = scratchFile('SeverityBadge.jsx', `const bg = '${colors.sev1}';`);

    expect(findSeverityColorViolations(file)).toEqual([]);
  });

  it('finds no violation for the real, live status page header component', () => {
    const headerPath = path.join(repoRoot, 'client/src/components/StatusPageHeader.jsx');
    expect(existsSync(headerPath)).toBe(true);

    expect(findSeverityColorViolations('client/src/components/StatusPageHeader.jsx')).toEqual([]);
  });
});
