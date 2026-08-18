import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { initDatabase } from '../../src/models/db.js';
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
