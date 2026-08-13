import { describe, it, expect } from 'vitest';
import { readFileSync, lstatSync, existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), 'utf-8'));
}

describe('root package.json workspaces configuration', () => {
  const pkg = readJson('package.json');

  it('declares a workspaces array', () => {
    expect(Array.isArray(pkg.workspaces)).toBe(true);
  });

  it('includes both the frontend and backend workspaces', () => {
    expect(pkg.workspaces).toContain('frontend');
    expect(pkg.workspaces).toContain('backend');
  });

  it('is marked private, as required for npm workspaces', () => {
    expect(pkg.private).toBe(true);
  });
});

describe('workspace package manifests', () => {
  it('frontend/package.json is a valid, minimally-populated manifest', () => {
    const pkg = readJson('frontend/package.json');
    expect(pkg.name).toBe('frontend');
    expect(typeof pkg.version).toBe('string');
  });

  it('backend/package.json is a valid, minimally-populated manifest', () => {
    const pkg = readJson('backend/package.json');
    expect(pkg.name).toBe('backend');
    expect(typeof pkg.version).toBe('string');
  });
});

describe('npm install resolves both workspaces (real installed state)', () => {
  it('links node_modules/frontend to the frontend/ workspace directory', () => {
    const linkPath = resolve(rootDir, 'node_modules/frontend');
    expect(existsSync(linkPath), 'node_modules/frontend is missing — did npm install run from the repo root?').toBe(true);
    expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);
    expect(realpathSync(linkPath)).toBe(realpathSync(resolve(rootDir, 'frontend')));
  });

  it('links node_modules/backend to the backend/ workspace directory', () => {
    const linkPath = resolve(rootDir, 'node_modules/backend');
    expect(existsSync(linkPath), 'node_modules/backend is missing — did npm install run from the repo root?').toBe(true);
    expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);
    expect(realpathSync(linkPath)).toBe(realpathSync(resolve(rootDir, 'backend')));
  });

  it('records both workspaces as linked packages in the lockfile', () => {
    const lock = readJson('package-lock.json');
    expect(lock.packages['node_modules/frontend']).toBeTruthy();
    expect(lock.packages['node_modules/frontend'].link).toBe(true);
    expect(lock.packages['node_modules/backend']).toBeTruthy();
    expect(lock.packages['node_modules/backend'].link).toBe(true);
  });
});
