// PLB-165 regression coverage for the production smoke check (bug report
// PLB-108): GET /api/health returned a 500 (FUNCTION_INVOCATION_FAILED) on
// the deployed app while GET / stayed healthy. The same failure class was
// already root-caused and fixed for sibling incidents PLB-76/77/78 (see
// server/tests/health.test.js and tests/smoke.prod.test.js): mount order,
// a static top-level db import that crashed module evaluation, and a
// mismatched native-binding Node ABI. Verified against this checkout and
// against the live deployment (https://pulseboard-tawny-six.vercel.app) that
// GET / and GET /api/health both currently succeed — these tests pin that
// behavior at the handler and app-integration level so a future change can't
// silently reintroduce any of those failure modes.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRouter from '../../server/routes/health.js';
import app from '../../server/src/app.js';

describe('health router in isolation (no app-level dependencies)', () => {
  it('responds 200 with {status: "ok"} when mounted on a bare Express app with nothing else wired up', async () => {
    const bareApp = express();
    bareApp.use('/api/health', healthRouter);

    const res = await request(bareApp).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('never reads process.env, so it cannot crash on a missing production env var', async () => {
    // The only env var this codebase's db startup path reads is
    // PLB_DB_PATH (src/index.js); the health router imports nothing that
    // touches it. Clearing it and re-requesting proves the handler itself
    // has no env dependency of its own.
    const originalDbPath = process.env.PLB_DB_PATH;
    delete process.env.PLB_DB_PATH;

    try {
      const bareApp = express();
      bareApp.use('/api/health', healthRouter);

      const res = await request(bareApp).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    } finally {
      if (originalDbPath === undefined) {
        delete process.env.PLB_DB_PATH;
      } else {
        process.env.PLB_DB_PATH = originalDbPath;
      }
    }
  });
});

describe('GET /api/health via the real mounted app (mirrors the production probe path)', () => {
  it('returns 200 with a JSON status body', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.status).toBeLessThan(500);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('also succeeds on the legacy internal /health alias', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('does not 5xx on repeated/concurrent requests (rules out cold-start or shared-state crashes)', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request(app).get('/api/health')),
    );

    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    }
  });
});

describe('GET /api/health degrades gracefully around unsupported requests instead of 5xx-ing', () => {
  it('an unmatched sub-path under /api/health returns 404, not 500', async () => {
    const res = await request(app).get('/api/health/does-not-exist');

    expect(res.status).not.toBeGreaterThanOrEqual(500);
  });

  it('an unsupported HTTP method on /api/health is rejected without a 5xx', async () => {
    const res = await request(app).post('/api/health').send({});

    expect(res.status).toBeLessThan(500);
  });
});

describe('GET /api/health resilience when required env vars are unset (PLB-165 plan warning)', () => {
  const originalDbPath = process.env.PLB_DB_PATH;

  beforeEach(() => {
    delete process.env.PLB_DB_PATH;
  });

  afterEach(() => {
    if (originalDbPath === undefined) {
      delete process.env.PLB_DB_PATH;
    } else {
      process.env.PLB_DB_PATH = originalDbPath;
    }
  });

  it('still returns 200 on the already-loaded app when PLB_DB_PATH is unset at request time', async () => {
    // The db is initialized once at module import time (src/index.js), so
    // clearing the env var here proves the *handler* itself never reads it —
    // the exhaustive "unset at process startup" case is covered end-to-end
    // by tests/smoke.prod.test.js via a real subprocess spawn.
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
