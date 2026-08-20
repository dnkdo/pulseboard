// Post-deploy smoke check (PLB-162 / bug report PLB-111): production probes
// hit GET / and GET /api/health and must get a real response — 2xx/3xx for
// '/', anything short of 5xx for '/api/health'. When SMOKE_URL is set (a real
// deployed URL, e.g. wired into a post-deploy CI step) this hits it directly.
// Without it, these tests exercise the same two endpoints against a locally
// spawned copy of the real server process, plus the specific fixes that made
// the original probe fail: the '/api/health' route existing at all, and
// database init failures not being able to crash the whole function.
import { describe, it, expect, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverRoot = path.join(repoRoot, 'server');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

const SMOKE_URL = process.env.SMOKE_URL;

describe.skipIf(!SMOKE_URL)('production smoke check (SMOKE_URL)', () => {
  it('GET / returns 2xx/3xx', async () => {
    const res = await fetch(new URL('/', SMOKE_URL));
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
  });

  it('GET /api/health does not 5xx', async () => {
    const res = await fetch(new URL('/api/health', SMOKE_URL));
    expect(res.status).toBeLessThan(500);
  });
});

describe('local server process smoke check', () => {
  let child;

  afterEach(() => {
    if (child && !child.killed) {
      child.kill();
    }
  });

  function startServer(env) {
    return new Promise((resolve, reject) => {
      child = spawn(process.execPath, ['src/index.js'], {
        cwd: serverRoot,
        env: { ...process.env, ...env },
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        reject(new Error(`Server did not start in time. stdout=${stdout} stderr=${stderr}`));
      }, 10000);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        const match = stdout.match(/listening on port (\d+)/i);
        if (match) {
          clearTimeout(timeout);
          resolve(Number(match[1]));
        }
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('exit', (code) => {
        if (code !== null && code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server exited early with code ${code}. stderr=${stderr}`));
        }
      });
    });
  }

  it('GET /api/health returns 200 against a real spawned process (mirrors the prod probe path)', async () => {
    // Probes /api/health — the path CLAUDE.md's API surface and the public
    // smoke probe actually use — not the pre-existing internal-only /health.
    const port = await startServer({ PORT: String(3900 + Math.floor(Math.random() * 500)) });

    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('GET /api/health survives a broken PLB_DB_PATH that would otherwise crash startup', async () => {
    const port = await startServer({
      PORT: String(3900 + Math.floor(Math.random() * 500)),
      PLB_DB_PATH: '/nonexistent-dir-plb-162/db.sqlite',
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
  });
});

describe('DB initialization failure does not crash module import or take down /api/health', () => {
  // A subprocess (not an in-process dynamic import) is required here: ESM
  // module caching means a second import of server/src/app.js within this
  // same test file would just return the already-initialized module instead
  // of re-running the top-level init-and-seed logic under a broken env var.
  function runHealthProbeScript(env) {
    const script = `
      import request from 'supertest';
      import app from './server/src/app.js';
      const health = await request(app).get('/api/health');
      console.log('HEALTH_STATUS:' + health.status);
      const stats = await request(app).get('/api/stats');
      console.log('STATS_STATUS:' + stats.status);
    `;
    return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      encoding: 'utf-8',
      timeout: 15000,
    });
  }

  it('with a valid (default in-memory) DB, both health and a DB-backed route succeed', () => {
    const result = runHealthProbeScript({ PLB_DB_PATH: '' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('HEALTH_STATUS:200');
    expect(result.stdout).toContain('STATS_STATUS:200');
  });

  it('with an unwritable PLB_DB_PATH, the process does not crash and /api/health still returns 200', () => {
    const result = runHealthProbeScript({ PLB_DB_PATH: '/nonexistent-dir-plb-162/db.sqlite' });

    // The process itself must exit cleanly (the module import must not throw
    // synchronously and kill the whole function) even though the DB is down.
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('HEALTH_STATUS:200');
    // A DB-backed route is allowed to fail when the DB is genuinely down —
    // it just must not take the whole process/module down with it.
    expect(result.stdout).toContain('STATS_STATUS:500');
  });
});

describe('Vercel function runtime pinned to match the CI/deploy Node version', () => {
  // Root cause: better-sqlite3's native binding is compiled during `npm
  // install` under whatever Node version runs the build (pinned to 20 in
  // .github/workflows/ci.yml and deploy.yml). Vercel's default Node.js
  // Lambda runtime for new functions is newer than that, so the compiled
  // binary's ABI (NODE_MODULE_VERSION) didn't match the runtime that loaded
  // it on cold start, crashing every request handled by that function —
  // including GET /api/health (500) — a fully separate mechanism from the
  // route-path fix above, and the one that explains why it broke only in
  // production.
  it('server/package.json pins engines.node to the same major version as CI/deploy (20.x)', () => {
    const serverPkg = readJson('server/package.json');
    const ci = readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf-8');
    const deploy = readFileSync(path.join(repoRoot, '.github/workflows/deploy.yml'), 'utf-8');

    expect(serverPkg.engines).toBeDefined();
    expect(typeof serverPkg.engines.node).toBe('string');

    const pinnedMajor = serverPkg.engines.node.match(/^(\d+)/)?.[1];
    const ciMajor = ci.match(/node-version:\s*['"]?(\d+)/)?.[1];
    const deployMajor = deploy.match(/node-version:\s*['"]?(\d+)/)?.[1];

    expect(pinnedMajor).toBeTruthy();
    expect(pinnedMajor).toBe(ciMajor);
    expect(pinnedMajor).toBe(deployMajor);
  });

  it('root package.json also pins engines.node (keeps the whole project on one Node line)', () => {
    const rootPkg = readJson('package.json');
    expect(rootPkg.engines).toBeDefined();
    expect(typeof rootPkg.engines.node).toBe('string');
  });
});
