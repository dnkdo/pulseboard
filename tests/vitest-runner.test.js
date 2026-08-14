import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Matches CSI/OSC ANSI escape sequences (e.g. color codes) that reporters may
// emit even when stdout is piped; strip them before matching plain text.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_PATTERN = /\[[0-9;]*[a-zA-Z]/g;

function stripAnsi(input) {
  return input.replace(ANSI_ESCAPE_PATTERN, '');
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('client/package.json and server/package.json declare vitest', () => {
  it('client declares vitest and jsdom as devDependencies', () => {
    const pkg = readJson('client/package.json');
    expect(typeof pkg.devDependencies.vitest).toBe('string');
    expect(typeof pkg.devDependencies.jsdom).toBe('string');
  });

  it('server declares vitest as a devDependency', () => {
    const pkg = readJson('server/package.json');
    expect(typeof pkg.devDependencies.vitest).toBe('string');
  });

  it('client and server pin the same vitest version to avoid duplicate installs', () => {
    const clientVersion = readJson('client/package.json').devDependencies.vitest;
    const serverVersion = readJson('server/package.json').devDependencies.vitest;
    const rootVersion = readJson('package.json').devDependencies.vitest;
    expect(clientVersion).toBe(rootVersion);
    expect(serverVersion).toBe(rootVersion);
  });
});

describe('client/vitest.config.js', () => {
  it('exists on disk', () => {
    expect(existsSync(path.join(repoRoot, 'client', 'vitest.config.js'))).toBe(true);
  });

  it('resolves a test.environment of jsdom (not the node default)', async () => {
    const configUrl = pathToFileURL(path.join(repoRoot, 'client', 'vitest.config.js')).href;
    const config = (await import(configUrl)).default;
    expect(config.test.environment).toBe('jsdom');
  });

  it('keeps the React plugin from vite.config.js so JSX still compiles under vitest', async () => {
    const configUrl = pathToFileURL(path.join(repoRoot, 'client', 'vitest.config.js')).href;
    const config = (await import(configUrl)).default;
    expect(Array.isArray(config.plugins)).toBe(true);
    expect(config.plugins.length).toBeGreaterThan(0);
  });
});

describe('root package.json test script', () => {
  it('runs vitest and delegates to every workspace test script', () => {
    const rootPkg = readJson('package.json');
    expect(rootPkg.scripts.test).toMatch(/vitest run/);
    expect(rootPkg.scripts.test).toMatch(/--workspaces/);
    expect(rootPkg.scripts.test).toMatch(/--if-present/);
  });

  it('runs vitest in non-watch (`run`) mode in every package so the CLI exits instead of hanging', () => {
    expect(readJson('package.json').scripts.test).not.toBe('vitest');
    expect(readJson('client/package.json').scripts.test).toBe('vitest run');
    expect(readJson('server/package.json').scripts.test).toBe('vitest run');
  });
});

describe('npm test end-to-end (CLI)', () => {
  it('exits 0 and reports passing test files across the root suite and every workspace', () => {
    if (process.env.PULSEBOARD_TEST_NO_RECURSE === '1') {
      // Already running inside a spawned `npm test` started by this very test;
      // skip spawning another one so the check terminates instead of recursing forever.
      return;
    }

    const output = execFileSync('npm', ['test'], {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: {
        ...process.env,
        PULSEBOARD_TEST_NO_RECURSE: '1',
        // Force plain-text reporter output regardless of the parent
        // environment's color support, so the assertions below don't have
        // to account for ANSI escape codes wrapping the summary line.
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
    });

    const plainOutput = stripAnsi(output);

    expect(plainOutput).toMatch(/Test Files\s+\d+ passed/);
    expect(plainOutput).not.toMatch(/Test Files\s+\d+ failed/);
  }, 120000);
});
