import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('root package.json declares eslint and prettier tooling', () => {
  const rootPkg = readJson('package.json');

  it('declares eslint and prettier as devDependencies', () => {
    expect(rootPkg.devDependencies).toHaveProperty('eslint');
    expect(rootPkg.devDependencies).toHaveProperty('prettier');
    expect(typeof rootPkg.devDependencies.eslint).toBe('string');
    expect(typeof rootPkg.devDependencies.prettier).toBe('string');
  });

  it('declares lint and format scripts', () => {
    expect(typeof rootPkg.scripts.lint).toBe('string');
    expect(rootPkg.scripts.lint).toMatch(/eslint/);
    expect(typeof rootPkg.scripts.format).toBe('string');
    expect(rootPkg.scripts.format).toMatch(/prettier/);
  });
});

describe('root ESLint config', () => {
  it('exists as .eslintrc.js or .eslintrc.json at the repo root', () => {
    const hasEslintrcJs = existsSync(path.join(repoRoot, '.eslintrc.js'));
    const hasEslintrcJson = existsSync(path.join(repoRoot, '.eslintrc.json'));
    expect(hasEslintrcJs || hasEslintrcJson).toBe(true);
  });

  it('covers client source with a React-aware override, and server source via the root Node env', () => {
    const config = readJson('.eslintrc.json');

    // server/ needs no dedicated override: root-level env.node/es2021 already
    // applies to it, and no React-flavored override's "files" pattern reaches
    // into server/ (which would false-positive on JSX/browser-only rules).
    expect(config.env.node).toBe(true);
    expect(config.env.es2021).toBe(true);

    const reactOverrides = config.overrides.filter((override) =>
      (override.extends || []).some((ext) => ext.includes('react')),
    );
    expect(reactOverrides.length).toBeGreaterThan(0);
    expect(
      reactOverrides.every((override) =>
        override.files.every((pattern) => !pattern.includes('server/')),
      ),
    ).toBe(true);

    const clientOverride = config.overrides.find((override) =>
      override.files.some((pattern) => pattern.includes('client/')),
    );
    expect(clientOverride).toBeTruthy();
    expect(clientOverride.extends).toEqual(
      expect.arrayContaining(['plugin:react/recommended', 'plugin:react-hooks/recommended']),
    );
  });
});

describe('root Prettier config', () => {
  it('.prettierrc exists at the repo root and defines formatting standards', () => {
    const prettierrcPath = path.join(repoRoot, '.prettierrc');
    expect(existsSync(prettierrcPath)).toBe(true);

    const config = JSON.parse(readFileSync(prettierrcPath, 'utf-8'));
    expect(typeof config.semi).toBe('boolean');
    expect(typeof config.singleQuote).toBe('boolean');
    expect(typeof config.printWidth).toBe('number');
  });
});

describe('lint script actually covers the full server source tree', () => {
  it('includes a `server` target (not just `server/src`) so routes/models/store/utils are linted', () => {
    const rootPkg = readJson('package.json');
    expect(rootPkg.scripts.lint).toMatch(/(^|\s)server(\s|$)/);
    expect(rootPkg.scripts.lint).not.toMatch(/server\/src(\s|$)/);
  });

  it(
    'ESLint actually processes files in server/routes, server/models, server/store, and server/utils',
    () => {
      const output = execFileSync(
        'npx',
        ['eslint', 'server', '--ext', '.js', '--format', 'json', '--no-error-on-unmatched-pattern'],
        { cwd: repoRoot, encoding: 'utf-8', timeout: 30_000 },
      );
      const results = JSON.parse(output);
      const lintedFiles = results.map((r) => path.relative(repoRoot, r.filePath));

      expect(lintedFiles).toEqual(
        expect.arrayContaining([
          path.join('server', 'routes', 'incidents.js'),
          path.join('server', 'models', 'component.js'),
          path.join('server', 'store', 'incidentStore.js'),
          path.join('server', 'utils', 'exportIncidents.js'),
          path.join('server', 'utils', 'groupComponents.js'),
        ]),
      );
    },
    30_000,
  );
});

describe('npm run lint on the scaffolded codebase', () => {
  let result;
  let threw = false;

  beforeAll(() => {
    try {
      result = execFileSync('npm', ['run', 'lint'], {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      threw = true;
      result = error;
    }
  }, 60_000);

  it('exits 0 with no lint errors', () => {
    if (threw) {
      throw new Error(
        `npm run lint failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`,
      );
    }
    expect(threw).toBe(false);
  });

  it('does not report any ESLint problems in its summary', () => {
    const output = threw ? `${result.stdout ?? ''}${result.stderr ?? ''}` : result;
    expect(output).not.toMatch(/\d+\s+problems?\s*\(\d+\s+errors?/i);
  });
});
