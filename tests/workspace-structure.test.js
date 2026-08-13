import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('root package.json workspaces', () => {
  const rootPkg = readJson('package.json');

  it('declares a workspaces array containing client and server', () => {
    expect(Array.isArray(rootPkg.workspaces)).toBe(true);
    expect(rootPkg.workspaces).toEqual(expect.arrayContaining(['client', 'server']));
  });

  it('preserves the existing root package.json fields', () => {
    expect(rootPkg.name).toBe('pulseboard');
    expect(rootPkg.main).toBe('src/index.js');
    expect(rootPkg.scripts.test).toBe('vitest run');
    expect(rootPkg.dependencies['better-sqlite3']).toBeDefined();
  });
});

describe('client workspace package', () => {
  it('has a valid package.json with a name field', () => {
    const pkg = readJson('client/package.json');
    expect(typeof pkg.name).toBe('string');
    expect(pkg.name.length).toBeGreaterThan(0);
  });

  it.each(['dashboard', 'status-page', 'shared'])('has a client/src/%s directory', (dir) => {
    const dirPath = path.join(repoRoot, 'client', 'src', dir);
    expect(existsSync(dirPath)).toBe(true);
    expect(statSync(dirPath).isDirectory()).toBe(true);
  });
});

describe('server workspace package', () => {
  it('has a valid package.json with a name field', () => {
    const pkg = readJson('server/package.json');
    expect(typeof pkg.name).toBe('string');
    expect(pkg.name.length).toBeGreaterThan(0);
  });

  it('has a server/src directory for the Express API', () => {
    const dirPath = path.join(repoRoot, 'server', 'src');
    expect(existsSync(dirPath)).toBe(true);
    expect(statSync(dirPath).isDirectory()).toBe(true);
  });
});

describe('client and server package names do not collide', () => {
  it('uses distinct workspace package names', () => {
    const clientName = readJson('client/package.json').name;
    const serverName = readJson('server/package.json').name;
    expect(clientName).not.toBe(serverName);
  });
});
