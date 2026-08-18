import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isAllowedFileForSeverityColor, scanForViolations, SEVERITY_COLOR_TOKEN_PATTERN } from '../src/lib/severityAudit.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('isAllowedFileForSeverityColor', () => {
  it.each([
    // AC1: the two paths named directly by the task's test contract.
    ['src/components/dashboard/SeverityTimeline.jsx', true],
    ['client/src/components/SeverityBadge/SeverityBadge.jsx', true],
    // real files in this repo that must be recognized as the allowlist.
    ['client/src/components/SeverityBadge.jsx', true],
    ['src/components/dashboard/Timeline.jsx', true],
    ['src/components/dashboard/Timeline.styles.js', true],
  ])('allows %s', (filePath, expected) => {
    expect(isAllowedFileForSeverityColor(filePath)).toBe(expected);
  });

  it.each([
    // AC1: the disallowed path named directly by the task's test contract.
    ['src/components/dashboard/StatCard.jsx', false],
    // other plausible dashboard/component files that must stay denied.
    ['src/components/dashboard/StatCards.jsx', false],
    ['src/components/dashboard/Chip.jsx', false],
    // filename references "Badge"/"severity" but is not the approved
    // SeverityBadge component — must not be swept in by a loose match.
    ['client/src/components/StatusBadge.jsx', false],
    ['client/src/components/severityLabel.js', false],
    // the color-mapping module itself lives under components/ but is not
    // named Timeline/SeverityBadge — allowlist is by identity, not folder.
    ['src/components/dashboard/severityColors.js', false],
    // non-component files, including the token-definition module.
    ['server/routes/incidents.js', false],
    ['src/theme/tokens.js', false],
    // right name, not under any components/ directory.
    ['src/lib/Timeline.js', false],
    // right name, disallowed extension.
    ['client/src/components/SeverityBadgeWrapper.txt', false],
    // invalid input must default-deny, not throw.
    ['', false],
    [null, false],
    [undefined, false],
  ])('denies %s', (filePath, expected) => {
    expect(isAllowedFileForSeverityColor(filePath)).toBe(expected);
  });

  it('is a pure filename check independent of Windows-style separators', () => {
    expect(isAllowedFileForSeverityColor('client\\src\\components\\SeverityBadge.jsx')).toBe(true);
    expect(isAllowedFileForSeverityColor('src\\components\\dashboard\\StatCard.jsx')).toBe(false);
  });
});

describe('scanForViolations', () => {
  const scratchDirs = [];

  afterEach(() => {
    while (scratchDirs.length > 0) {
      rmSync(scratchDirs.pop(), { recursive: true, force: true });
    }
  });

  function makeScratchDir() {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-audit-'));
    scratchDirs.push(dir);
    return dir;
  }

  it('flags a severity color token in a disallowed component file', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'StatCard.jsx'), "export const style = { color: SEV1_COLOR };\n");

    const violations = scanForViolations(dir);

    expect(violations).toEqual([{ file: 'components/StatCard.jsx', line: 1, token: 'SEV1_COLOR' }]);
  });

  it('does not flag the same token in an allowlisted severity-badge/timeline file', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'SeverityBadge.jsx'), "export const style = { color: SEV1_COLOR };\n");

    expect(scanForViolations(dir)).toEqual([]);
  });

  it('produces no false positives for files with no severity color tokens', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'HealthTile.jsx'), "export const style = { color: STATE_OPEN };\n");
    writeFileSync(path.join(dir, 'components', 'Notes.jsx'), "// this component has severity and badge in a comment, no real token\n");

    expect(scanForViolations(dir)).toEqual([]);
  });

  it('ignores a matching token inside a .test.jsx file', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'StatCard.test.jsx'), "expect(SEV1_COLOR).toBeDefined();\n");

    expect(scanForViolations(dir)).toEqual([]);
  });

  it('ignores a matching token outside the scanned extensions (.js token/mapping modules)', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'severityColors.js'), "export const SEV1_COLOR = '#EF4444';\n");

    expect(scanForViolations(dir)).toEqual([]);
  });

  it('flags a disallowed file even outside any components/ directory (default-deny)', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'lib'), { recursive: true });
    writeFileSync(path.join(dir, 'lib', 'Weird.jsx'), "const bg = 'colors.sev2';\n");

    const violations = scanForViolations(dir);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'lib/Weird.jsx', token: 'colors.sev2' });
  });

  it('reports every violating line, not just the first', () => {
    const dir = makeScratchDir();
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(
      path.join(dir, 'components', 'Chip.jsx'),
      ["const a = SEV1_COLOR;", "const b = 'ok';", "const c = SEV2_COLOR;"].join('\n') + '\n',
    );

    const violations = scanForViolations(dir);

    expect(violations).toEqual([
      { file: 'components/Chip.jsx', line: 1, token: 'SEV1_COLOR' },
      { file: 'components/Chip.jsx', line: 3, token: 'SEV2_COLOR' },
    ]);
  });

  it('skips node_modules, dist, build, and .git while walking', () => {
    const dir = makeScratchDir();
    for (const skipped of ['node_modules', 'dist', 'build', '.git']) {
      mkdirSync(path.join(dir, skipped), { recursive: true });
      writeFileSync(path.join(dir, skipped, 'Bad.jsx'), "const bg = SEV1_COLOR;\n");
    }

    expect(scanForViolations(dir)).toEqual([]);
  });

  it('AC3: reports zero violations against the real, live dashboard codebase', () => {
    expect(scanForViolations('.')).toEqual([]);
  });

  it('SEVERITY_COLOR_TOKEN_PATTERN matches every real token spelling used in this repo', () => {
    for (const sample of ['SEV1_COLOR', 'SEV2_COLOR', 'SEV3_COLOR', 'colors.sev1', 'colors.sev2', 'colors.sev3']) {
      expect(sample.match(SEVERITY_COLOR_TOKEN_PATTERN)).not.toBeNull();
    }
    expect('SEVERE_COLOR'.match(SEVERITY_COLOR_TOKEN_PATTERN)).toBeNull();
  });
});

describe('audit-severity-colors CLI', () => {
  const scratchDirs = [];

  afterEach(() => {
    while (scratchDirs.length > 0) {
      rmSync(scratchDirs.pop(), { recursive: true, force: true });
    }
  });

  it('AC3: exits 0 and prints a pass message when run against the real repo', () => {
    const output = execFileSync('node', ['scripts/audit-severity-colors.js'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });

    expect(output).toMatch(/audit passed/i);
  });

  it('AC2: exits non-zero and reports the offending file/token when a violation exists', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-audit-cli-'));
    scratchDirs.push(dir);
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'StatCard.jsx'), "export const style = { color: SEV1_COLOR };\n");

    let error;
    try {
      execFileSync('node', ['scripts/audit-severity-colors.js', dir], { cwd: repoRoot, encoding: 'utf-8' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeDefined();
    expect(error.status).not.toBe(0);
    expect(error.stderr).toMatch(/StatCard\.jsx/);
    expect(error.stderr).toMatch(/SEV1_COLOR/);
  });

  it('exits 0 against a fixture directory with zero violations', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'severity-audit-cli-clean-'));
    scratchDirs.push(dir);
    mkdirSync(path.join(dir, 'components'), { recursive: true });
    writeFileSync(path.join(dir, 'components', 'HealthTile.jsx'), "export const style = { color: 'blue' };\n");

    const output = execFileSync('node', ['scripts/audit-severity-colors.js', dir], { cwd: repoRoot, encoding: 'utf-8' });

    expect(output).toMatch(/audit passed/i);
  });
});
