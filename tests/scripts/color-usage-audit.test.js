import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  listSourceFiles,
  findSeverityColorViolations,
  SEVERITY_HEX_VALUES,
} from '../../scripts/color-usage-audit.js';
import { SEV1_COLOR } from '../../src/theme/tokens.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('color-usage-audit script (CLI)', () => {
  it('exits 0 and reports a pass when run against the real repo', () => {
    const output = execFileSync('node', ['scripts/color-usage-audit.js'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });
    expect(output).toMatch(/audit passed/i);
  });
});

describe('findSeverityColorViolations', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  it('flags a fixture file that hardcodes a raw severity hex value (AC: all severity colors use design tokens)', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'color-audit-'));
    const violatingFile = path.join(tmpDir, 'BadComponent.jsx');
    writeFileSync(violatingFile, `export const style = { color: '${SEV1_COLOR}' };\n`);

    const violations = findSeverityColorViolations(listSourceFiles(tmpDir), { tokenModule: '/nonexistent' });

    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe(violatingFile);
    expect(violations[0].hex).toBe(SEV1_COLOR);
  });

  it('does not flag a clean fixture file with no raw severity hex literals', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'color-audit-'));
    const cleanFile = path.join(tmpDir, 'GoodComponent.jsx');
    writeFileSync(cleanFile, "import { getSeverityColor } from './severityColors.js';\n");

    const violations = findSeverityColorViolations(listSourceFiles(tmpDir), { tokenModule: '/nonexistent' });

    expect(violations).toEqual([]);
  });

  it('exempts the designated token module even though it legitimately defines the raw hex values', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'color-audit-'));
    const tokenModule = path.join(tmpDir, 'tokens.js');
    writeFileSync(tokenModule, `export const SEV1_COLOR = '${SEV1_COLOR}';\n`);

    const violations = findSeverityColorViolations(listSourceFiles(tmpDir), { tokenModule });

    expect(violations).toEqual([]);
  });

  it('ignores non-JS/JSX files even if they contain a raw severity hex literal', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'color-audit-'));
    writeFileSync(path.join(tmpDir, 'notes.md'), `SEV1 is ${SEV1_COLOR}\n`);

    const violations = findSeverityColorViolations(listSourceFiles(tmpDir), { tokenModule: '/nonexistent' });

    expect(violations).toEqual([]);
  });

  it('exposes exactly the SEV1/SEV2/SEV3 token values as the scanned literals', () => {
    expect(SEVERITY_HEX_VALUES).toHaveLength(3);
    expect(SEVERITY_HEX_VALUES).toContain(SEV1_COLOR);
  });
});
