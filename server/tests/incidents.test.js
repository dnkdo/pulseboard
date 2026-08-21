import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { initDatabase } from '../../src/models/db.js';
import { loadSeedIncidents } from '../../src/models/seed.js';
import { createIncidentsRouter } from '../src/routes/incidents.js';

function buildApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/api/incidents', createIncidentsRouter(db));
  return app;
}

function insertComponent(db, id = 'comp-1') {
  db.prepare(
    "INSERT INTO components (id, name, description, created_at) VALUES (?, 'API', 'Core API', '2026-08-01T00:00:00.000Z')"
  ).run(id);
}

function insertIncident(db, { id, state, componentId = 'comp-1' }) {
  db.prepare(
    `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
     VALUES (?, 'API latency spike', 'x', 'SEV2', ?, ?, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')`
  ).run(id, state, componentId);
}

describe('PATCH /api/incidents/:id', () => {
  let db;

  beforeEach(() => {
    db = initDatabase();
    insertComponent(db);
  });

  it('applies a valid sequential transition and returns the updated incident', async () => {
    insertIncident(db, { id: 'inc-1', state: 'open' });

    const res = await request(buildApp(db)).patch('/api/incidents/inc-1').send({ state: 'investigating' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'inc-1', state: 'investigating' });
  });

  it('records the transition in incident_state_transitions', async () => {
    insertIncident(db, { id: 'inc-1', state: 'open' });

    await request(buildApp(db)).patch('/api/incidents/inc-1').send({ state: 'investigating' });

    const transitions = db
      .prepare('SELECT * FROM incident_state_transitions WHERE incident_id = ? ORDER BY id')
      .all('inc-1');
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ from_state: 'open', to_state: 'investigating' });
  });

  it('rejects a skipped-state transition with 400 and does not mutate the incident', async () => {
    insertIncident(db, { id: 'inc-1', state: 'open' });

    const res = await request(buildApp(db)).patch('/api/incidents/inc-1').send({ state: 'resolved' });

    expect(res.status).toBe(400);
    const incident = db.prepare('SELECT state FROM incidents WHERE id = ?').get('inc-1');
    expect(incident.state).toBe('open');
  });

  it('rejects reopening a resolved incident with 400 and does not mutate the incident', async () => {
    insertIncident(db, { id: 'inc-1', state: 'resolved' });

    const res = await request(buildApp(db)).patch('/api/incidents/inc-1').send({ state: 'investigating' });

    expect(res.status).toBe(400);
    const incident = db.prepare('SELECT state FROM incidents WHERE id = ?').get('inc-1');
    expect(incident.state).toBe('resolved');
  });

  it('rejects an unknown state value with 400 and does not mutate the incident', async () => {
    insertIncident(db, { id: 'inc-1', state: 'open' });

    const res = await request(buildApp(db)).patch('/api/incidents/inc-1').send({ state: 'archived' });

    expect(res.status).toBe(400);
    const incident = db.prepare('SELECT state FROM incidents WHERE id = ?').get('inc-1');
    expect(incident.state).toBe('open');
  });

  it('rejects a missing state field with 400 and does not mutate the incident', async () => {
    insertIncident(db, { id: 'inc-1', state: 'open' });

    const res = await request(buildApp(db)).patch('/api/incidents/inc-1').send({});

    expect(res.status).toBe(400);
    const incident = db.prepare('SELECT state FROM incidents WHERE id = ?').get('inc-1');
    expect(incident.state).toBe('open');
  });

  it('returns 404 for an incident id that does not exist', async () => {
    const res = await request(buildApp(db)).patch('/api/incidents/does-not-exist').send({ state: 'investigating' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/incidents — PLB-168: db unavailable (e.g. Vercel native-binding failure)', () => {
  // Mirrors production: server/src/app.js passes `db = null` when
  // src/index.js's initDatabase()/seedIfFresh() throws at startup. Before
  // PLB-168 this crashed with "Cannot read properties of null (reading
  // 'prepare')", surfaced to callers as an unhandled Express 500.
  it('returns 200 with the full seed-backed list instead of throwing on a null db', async () => {
    const seedIncidents = loadSeedIncidents();

    const res = await request(buildApp(null)).get('/api/incidents');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(seedIncidents.length);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(seedIncidents.map((incident) => incident.id).sort());
  });

  it('GET /:id returns 200 for a seeded incident and 404 for an unknown one, both against a null db', async () => {
    const [seedIncident] = loadSeedIncidents();
    const app = buildApp(null);

    const found = await request(app).get(`/api/incidents/${seedIncident.id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(seedIncident.id);
    expect(found.body.stateHistory).toEqual([{ state: seedIncident.state, timestamp: seedIncident.created_at }]);

    const missing = await request(app).get('/api/incidents/does-not-exist');
    expect(missing.status).toBe(404);
  });

  it('stays healthy across repeated requests against the same null-db app (simulates a warm serverless lambda)', async () => {
    const app = buildApp(null);

    const first = await request(app).get('/api/incidents');
    const second = await request(app).get('/api/incidents');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it('POST /api/incidents returns 503 rather than crashing, since a write has no seed-backed fallback', async () => {
    const res = await request(buildApp(null)).post('/api/incidents').send({
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      summary: 'Elevated p99 latency',
    });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/database not initialized/i);
  });

  it('PATCH /api/incidents/:id returns 503 rather than crashing, since a write has no seed-backed fallback', async () => {
    const [seedIncident] = loadSeedIncidents();

    const res = await request(buildApp(null)).patch(`/api/incidents/${seedIncident.id}`).send({ state: 'investigating' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/database not initialized/i);
  });

  it('POST /api/incidents returns a structured 500 JSON body instead of an unhandled crash on an unexpected db error', async () => {
    const brokenDb = {
      prepare: () => {
        throw new Error('simulated unexpected failure');
      },
    };

    const res = await request(buildApp(brokenDb)).post('/api/incidents').send({
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      summary: 'Elevated p99 latency',
    });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create incident' });
  });

  it('PATCH /api/incidents/:id returns a structured 500 JSON body instead of an unhandled crash on an unexpected db error', async () => {
    const brokenDb = {
      prepare: () => {
        throw new Error('simulated unexpected failure');
      },
    };

    const res = await request(buildApp(brokenDb)).patch('/api/incidents/inc-1').send({ state: 'investigating' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to transition incident' });
  });
});
