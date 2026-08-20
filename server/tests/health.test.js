import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /health (build health smoke test)', () => {
  it('responds 200 with a status field present in the JSON body', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBeTruthy();
  });

  it('responds with a JSON content type', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// PLB-163 regression coverage: the production smoke check for GET /api/health
// returned a 500 (FUNCTION_INVOCATION_FAILED — a crashed serverless function,
// not an application-level error response) after PLB-78 shipped. Root cause:
// server/src/app.js statically imported the sqlite-backed db chain
// (src/index.js -> src/models/db.js -> the better-sqlite3 native binding).
// When that native binding fails to load for the deployed runtime, the throw
// happens during *module evaluation*, which is not something a try/catch
// around a later function call (src/index.js's own initializeDb() guard) can
// ever catch — it crashes the whole serverless function, including
// GET /api/health, before Express finishes being configured. These tests
// simulate that exact failure mode by making the db import chain throw, and
// assert the health routes stay up regardless.
describe('GET /api/health resilience to database startup failures (PLB-163)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('still returns 200 on GET /api/health when the db module fails to import', async () => {
    vi.doMock('../../src/index.js', () => {
      throw new Error('better-sqlite3: native binding failed to load for this runtime');
    });

    const { default: freshApp } = await import('../src/app.js');
    const res = await request(freshApp).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('still returns 200 on GET /health when the seed loader fails to import', async () => {
    vi.doMock('../db/seedLoader.js', () => {
      throw new Error('seed loader failed to import');
    });

    const { default: freshApp } = await import('../src/app.js');
    const res = await request(freshApp).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('degrades only the DB-backed routes, not health, when the db import throws', async () => {
    vi.doMock('../../src/index.js', () => {
      throw new Error('better-sqlite3: native binding failed to load for this runtime');
    });

    const { default: freshApp } = await import('../src/app.js');

    const healthRes = await request(freshApp).get('/api/health');
    expect(healthRes.status).toBe(200);

    const statsRes = await request(freshApp).get('/api/stats');
    expect(statsRes.status).not.toBe(200);
  });
});
