import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootPkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));

describe('root package.json workspaces declaration', () => {
  it('declares exactly the client and server workspaces, no more, no fewer', () => {
    expect(rootPkg.workspaces).toEqual(['client', 'server']);
  });
});

describe('client/src required subdirectories', () => {
  it.each(['dashboard', 'status-page', 'shared'])('client/src/%s exists as a directory', (dir) => {
    const dirPath = path.join(repoRoot, 'client', 'src', dir);
    expect(existsSync(dirPath)).toBe(true);
    expect(statSync(dirPath).isDirectory()).toBe(true);
  });
});

describe('server/src directory', () => {
  it('exists as a directory for the Express API', () => {
    const dirPath = path.join(repoRoot, 'server', 'src');
    expect(existsSync(dirPath)).toBe(true);
    expect(statSync(dirPath).isDirectory()).toBe(true);
  });
});
