import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(repoRoot, 'client');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('client/package.json', () => {
  const pkg = readJson('client/package.json');

  it('lists react and react-dom as dependencies', () => {
    expect(pkg.dependencies).toBeDefined();
    expect(typeof pkg.dependencies.react).toBe('string');
    expect(typeof pkg.dependencies['react-dom']).toBe('string');
  });

  it('pins react and react-dom to major version 18', () => {
    expect(pkg.dependencies.react).toMatch(/^[\^~]?18\./);
    expect(pkg.dependencies['react-dom']).toMatch(/^[\^~]?18\./);
  });

  it('lists vite as a devDependency', () => {
    expect(pkg.devDependencies).toBeDefined();
    expect(typeof pkg.devDependencies.vite).toBe('string');
  });

  it('does not list react, react-dom, or vite in the wrong dependency bucket', () => {
    expect(pkg.devDependencies.react).toBeUndefined();
    expect(pkg.devDependencies['react-dom']).toBeUndefined();
    expect(pkg.dependencies.vite).toBeUndefined();
  });

  it('declares a dev script that boots the Vite dev server', () => {
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.dev).toMatch(/vite/);
  });
});

describe('client/vite.config.js', () => {
  const source = readFileSync(path.join(clientDir, 'vite.config.js'), 'utf-8');

  it('imports the React plugin from @vitejs/plugin-react', () => {
    expect(source).toMatch(/from ['"]@vitejs\/plugin-react['"]/);
  });

  it('enables the React plugin in the plugins array', () => {
    expect(source).toMatch(/plugins:\s*\[\s*react\(\)/);
  });

  it('exports a defineConfig-based Vite config', () => {
    expect(source).toMatch(/from ['"]vite['"]/);
    expect(source).toMatch(/export default defineConfig/);
  });
});

describe('root package.json workspaces', () => {
  const pkg = readJson('package.json');

  it('registers client as an npm workspace so its deps hoist/link correctly', () => {
    expect(pkg.workspaces).toContain('client');
  });
});
