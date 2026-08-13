import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf-8'));
}

describe('root package.json workspaces', () => {
  it('declares a workspaces array containing client and server', () => {
    const pkg = readJson('package.json');
    expect(Array.isArray(pkg.workspaces)).toBe(true);
    expect(pkg.workspaces).toContain('client');
    expect(pkg.workspaces).toContain('server');
  });

  it('does not declare workspace paths other than client and server', () => {
    const pkg = readJson('package.json');
    expect(pkg.workspaces.sort()).toEqual(['client', 'server']);
  });

  it('each declared workspace path has its own package.json on disk', () => {
    const pkg = readJson('package.json');
    for (const workspacePath of pkg.workspaces) {
      const pkgJsonPath = path.join(rootDir, workspacePath, 'package.json');
      expect(fs.existsSync(pkgJsonPath), `${pkgJsonPath} should exist`).toBe(true);
      const workspacePkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      expect(typeof workspacePkg.name).toBe('string');
      expect(workspacePkg.name.length).toBeGreaterThan(0);
    }
  });
});

describe('client/src directory layout', () => {
  it.each(['dashboard', 'status-page', 'shared'])('contains a %s subdirectory', (dir) => {
    const dirPath = path.join(rootDir, 'client', 'src', dir);
    expect(fs.existsSync(dirPath)).toBe(true);
    expect(fs.statSync(dirPath).isDirectory()).toBe(true);
  });

  it('does not report a missing subdirectory as present', () => {
    const bogusPath = path.join(rootDir, 'client', 'src', 'nonexistent-subdir');
    expect(fs.existsSync(bogusPath)).toBe(false);
  });
});

describe('server/src directory', () => {
  it('exists for the Express API', () => {
    const serverSrc = path.join(rootDir, 'server', 'src');
    expect(fs.existsSync(serverSrc)).toBe(true);
    expect(fs.statSync(serverSrc).isDirectory()).toBe(true);
  });
});

describe('npm workspace registration (integration)', () => {
  it('resolves both client and server via `npm list --workspaces`', () => {
    const output = execFileSync('npm', ['list', '--workspaces', '--json'], {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(output);
    expect(Object.keys(parsed.dependencies || {})).toEqual(
      expect.arrayContaining(['client', 'server'])
    );
    expect(parsed.dependencies.client.resolved).toContain('client');
    expect(parsed.dependencies.server.resolved).toContain('server');
  });
});
