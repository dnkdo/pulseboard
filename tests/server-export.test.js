// PLB-167 regression coverage: the shopkit-class fix for "GET /api/health
// returns 500 on Vercel" requires the serverless entrypoint to export a
// request handler (the Express app) rather than ever binding to a port —
// Vercel's Node runtime invokes the exported handler directly per-request,
// so a top-level app.listen() call in that same module throws (no
// persistent port to bind in a serverless function) and crashes every
// route on the function, including GET /api/health, before Express even
// finishes being configured.
//
// This repo already splits that responsibility across two files
// (server/src/app.js exports-only, server/src/index.js is the dev/prod
// process entrypoint that calls listen()) rather than guarding a single
// file with a `require.main === module` check — these tests pin that split
// so it can't silently regress back into one listen()-calling module.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

function readJson(relativePath) {
  return JSON.parse(readSource(relativePath));
}

describe('server/src/app.js — serverless handler contract', () => {
  it('exports a callable Express app with no side-effecting app.listen() call in its own source', () => {
    const source = readSource('server/src/app.js');
    expect(source).not.toMatch(/\.listen\s*\(/);
    expect(source).toMatch(/export default app/);
  });

  it('does not bind to a port when imported (no http server created as an import side effect)', async () => {
    const createServerSpy = vi.spyOn(http, 'createServer');

    const { default: app } = await import('../server/src/app.js');

    expect(typeof app).toBe('function');
    expect(typeof app.use).toBe('function');
    expect(typeof app.handle).toBe('function');
    // Express apps do still expose `.listen` as a method callers may invoke
    // later (server/src/index.js does exactly that) — what must never
    // happen is *this module* invoking it during import.
    expect(typeof app.listen).toBe('function');
    expect(createServerSpy).not.toHaveBeenCalled();

    createServerSpy.mockRestore();
  });
});

describe('server/src/index.js — dev/prod process entrypoint', () => {
  it('is the module that imports app.js and calls listen(), not the other way around', () => {
    const source = readSource('server/src/index.js');
    expect(source).toMatch(/from ['"]\.\/app\.js['"]/);
    expect(source).toMatch(/app\.listen\s*\(/);
  });
});

describe('vercel.json — node function points at the export-only module', () => {
  it('routes the @vercel/node build to server/src/app.js, not the listen()-calling server/src/index.js', () => {
    const config = readJson('vercel.json');
    const serverBuild = config.builds.find((b) => b.use === '@vercel/node');

    expect(serverBuild).toBeDefined();
    expect(serverBuild.src).toBe('server/src/app.js');
    expect(serverBuild.src).not.toMatch(/index\.js$/);
  });

  it('disables Vercel framework auto-detection so the explicit builds/routes config is authoritative', () => {
    const config = readJson('vercel.json');
    expect(config.framework).toBeNull();
  });
});
