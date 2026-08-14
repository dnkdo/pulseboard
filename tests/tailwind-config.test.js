import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(repoRoot, 'client');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('client/package.json declares the Tailwind toolchain', () => {
  const pkg = readJson('client/package.json');

  it('lists tailwindcss, postcss, and autoprefixer as devDependencies', () => {
    expect(pkg.devDependencies).toBeDefined();
    expect(typeof pkg.devDependencies.tailwindcss).toBe('string');
    expect(typeof pkg.devDependencies.postcss).toBe('string');
    expect(typeof pkg.devDependencies.autoprefixer).toBe('string');
  });

  it('does not list the Tailwind toolchain as runtime dependencies', () => {
    expect(pkg.dependencies?.tailwindcss).toBeUndefined();
    expect(pkg.dependencies?.postcss).toBeUndefined();
    expect(pkg.dependencies?.autoprefixer).toBeUndefined();
  });
});

describe('client/tailwind.config.js', () => {
  const configPath = path.join(clientDir, 'tailwind.config.js');

  it('exists on disk', () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it('declares a content path covering client/src', () => {
    const source = readFileSync(configPath, 'utf-8');
    expect(source).toMatch(/content\s*:\s*\[[^\]]*\.\/src\/\*\*\/\*\.\{[^}]*jsx[^}]*\}[^\]]*\]/);
  });
});

describe('client/postcss.config.js', () => {
  it('exists and wires up the tailwindcss and autoprefixer plugins', () => {
    const configPath = path.join(clientDir, 'postcss.config.js');
    expect(existsSync(configPath)).toBe(true);
    const source = readFileSync(configPath, 'utf-8');
    expect(source).toMatch(/tailwindcss/);
    expect(source).toMatch(/autoprefixer/);
  });
});

describe('client/src/index.css base stylesheet', () => {
  const cssPath = path.join(clientDir, 'src', 'index.css');

  it('exists on disk', () => {
    expect(existsSync(cssPath)).toBe(true);
  });

  it('contains the base, components, and utilities @tailwind directives', () => {
    const source = readFileSync(cssPath, 'utf-8');
    expect(source).toMatch(/@tailwind\s+base\s*;/);
    expect(source).toMatch(/@tailwind\s+components\s*;/);
    expect(source).toMatch(/@tailwind\s+utilities\s*;/);
  });
});

describe('client entry point loads the base stylesheet', () => {
  it('main.jsx imports ./index.css', () => {
    const main = readFileSync(path.join(clientDir, 'src', 'main.jsx'), 'utf-8');
    expect(main).toMatch(/import\s+['"]\.\/index\.css['"]/);
  });
});

describe('npm run build produces compiled Tailwind utility CSS', () => {
  it('exits 0 and emits a CSS asset containing a real Tailwind utility rule', () => {
    const distDir = path.join(clientDir, 'dist');
    rmSync(distDir, { recursive: true, force: true });

    const result = spawnSync('npm', ['run', 'build'], {
      cwd: clientDir,
      encoding: 'utf-8',
      timeout: 120000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);

    const assetsDir = path.join(distDir, 'assets');
    expect(existsSync(assetsDir)).toBe(true);
    const cssFile = readdirSync(assetsDir).find((name) => name.endsWith('.css'));
    expect(cssFile).toBeDefined();

    const css = readFileSync(path.join(assetsDir, cssFile), 'utf-8');
    // .p-4 (padding: 1rem) only appears in the build output if Tailwind actually
    // compiled the utility class used in App.jsx — a broken pipeline would emit
    // an empty or Tailwind-directive-free stylesheet instead.
    expect(css).toMatch(/\.p-4\{padding:1rem\}/);
    expect(css).toMatch(/\.flex\{display:flex\}/);
  }, 130000);
});
