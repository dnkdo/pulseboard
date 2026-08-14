import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { initDatabase } from '../../src/models/db.js';
import { createStatsRouter, computeWindowUptimePercentage } from '../src/routes/stats.js';
import { createIncidentsRouter } from '../src/routes/incidents.js';

function buildApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/api/stats', createStatsRouter(db));
  app.use('/api/incidents', createIncidentsRouter(db));
  return app;
}

function insertComponent(db, id = 'comp-1') {
  db.prepare(
    "INSERT INTO components (id, name, description, created_at) VALUES (?, 'API', 'Core API', '2026-08-01T00:00:00.000Z')"
  ).run(id);
}

function insertIncident(db, { id, state, createdAt, updatedAt, componentId = 'comp-1' }) {
  db.prepare(
    `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
     VALUES (?, 'API latency spike', 'x', 'SEV2', ?, ?, ?, ?)`
  ).run(id, state, componentId, createdAt, updatedAt);
}

describe('GET /api/stats', () => {
  let db;

  beforeEach(() => {
    db = initDatabase();
    insertComponent(db);
  });

  it('returns 200 with the four expected fields and correct types', async () => {
    insertIncident(db, {
      id: 'inc-1',
      state: 'open',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    const res = await request(buildApp(db)).get('/api/stats');

    expect(res.status).toBe(200);
    expect(typeof res.body.openIncidents).toBe('number');
    expect(typeof res.body.mttr7d).toBe('number');
    expect(typeof res.body.incidentsThisMonth).toBe('number');
    expect(typeof res.body.uptimePercentage).toBe('number');
  });

  it('excludes resolved incidents from openIncidents', async () => {
    insertIncident(db, {
      id: 'inc-1',
      state: 'open',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
    insertIncident(db, {
      id: 'inc-2',
      state: 'resolved',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T01:00:00.000Z',
    });

    const res = await request(buildApp(db)).get('/api/stats');

    expect(res.body.openIncidents).toBe(1);
  });

  it('reflects a state transition to resolved immediately on the next GET, with no caching', async () => {
    insertIncident(db, {
      id: 'inc-1',
      state: 'identified',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    const app = buildApp(db);

    const before = await request(app).get('/api/stats');
    expect(before.body.openIncidents).toBe(1);

    const patchRes = await request(app).patch('/api/incidents/inc-1').send({ state: 'resolved' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.state).toBe('resolved');

    const after = await request(app).get('/api/stats');
    expect(after.body.openIncidents).toBe(0);
    expect(after.body.openIncidents).not.toBe(before.body.openIncidents);
  });

  it('returns a 404 for an unrelated route', async () => {
    const res = await request(buildApp(db)).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('counts an incident created via POST /api/incidents, and reflects its PATCH to resolved — regression test for the split incident-store bug where POST wrote to a separate in-memory store invisible to computeStatCards', async () => {
    const app = buildApp(db);

    const postRes = await request(app).post('/api/incidents').send({
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      summary: 'Elevated p99 latency',
    });
    expect(postRes.status).toBe(201);
    const incidentId = postRes.body.id;

    const afterCreate = await request(app).get('/api/stats');
    expect(afterCreate.body.openIncidents).toBe(1);

    const patchRes = await request(app).patch(`/api/incidents/${incidentId}`).send({ state: 'investigating' });
    expect(patchRes.status).toBe(200);

    const afterPatch = await request(app).get('/api/stats');
    expect(afterPatch.body.openIncidents).toBe(1);
    expect(afterPatch.body.incidentsThisMonth).toBeGreaterThanOrEqual(1);
  });
});

describe('computeWindowUptimePercentage', () => {
  const NOW = new Date('2026-08-13T00:00:00.000Z');

  it('returns 100 when there are no incidents', () => {
    expect(computeWindowUptimePercentage([], NOW)).toBe(100);
  });

  it('subtracts clipped downtime for a resolved incident within the window', () => {
    const incidents = [
      {
        state: 'resolved',
        created_at: '2026-08-12T00:00:00.000Z',
        updated_at: '2026-08-12T12:00:00.000Z',
      },
    ];
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    const downtimeMs = 12 * 60 * 60 * 1000;
    const expected = ((windowMs - downtimeMs) / windowMs) * 100;

    expect(computeWindowUptimePercentage(incidents, NOW)).toBeCloseTo(expected, 10);
  });

  it('treats a still-open incident as downtime through `now`', () => {
    const incidents = [{ state: 'open', created_at: '2026-08-12T00:00:00.000Z', updated_at: '2026-08-12T00:00:00.000Z' }];
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    const downtimeMs = 24 * 60 * 60 * 1000;
    const expected = ((windowMs - downtimeMs) / windowMs) * 100;

    expect(computeWindowUptimePercentage(incidents, NOW)).toBeCloseTo(expected, 10);
  });
});
