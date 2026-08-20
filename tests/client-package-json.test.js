import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'client', 'package.json'), 'utf-8'));

describe('client/package.json dependencies', () => {
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
    expect(pkg.devDependencies?.react).toBeUndefined();
    expect(pkg.devDependencies?.['react-dom']).toBeUndefined();
    expect(pkg.dependencies?.vite).toBeUndefined();
  });
});
