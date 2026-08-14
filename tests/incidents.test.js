import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { initDatabase } from '../src/models/db.js';
import { seedDatabase, loadSeedIncidents } from '../src/models/seed.js';
import { createIncidentsRouter } from '../server/src/routes/incidents.js';
import { serializeIncident } from '../src/controllers/incidentsController.js';

function buildApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/api/incidents', createIncidentsRouter(db));
  return app;
}

function seededApp() {
  const db = initDatabase();
  seedDatabase(db);
  return { db, app: buildApp(db) };
}

const REQUIRED_FIELDS = ['id', 'title', 'severity', 'affectedComponents', 'summary', 'state', 'stateHistory'];

describe('serializeIncident', () => {
  it('maps snake_case store fields (affected_components, description) to the response shape', () => {
    const result = serializeIncident({
      id: 'inc-1',
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      description: 'Elevated latency on the core API',
      state: 'investigating',
      stateHistory: [{ state: 'open', timestamp: '2026-08-01T00:00:00.000Z' }],
    });

    expect(result).toEqual({
      id: 'inc-1',
      title: 'API latency spike',
      severity: 'SEV2',
      affectedComponents: ['api'],
      summary: 'Elevated latency on the core API',
      state: 'investigating',
      stateHistory: [{ state: 'open', timestamp: '2026-08-01T00:00:00.000Z' }],
    });
  });

  it('prefers already-camelCase fields over their snake_case equivalents when both are present', () => {
    const result = serializeIncident({
      affectedComponents: ['db'],
      affected_components: ['ignored'],
      summary: 'preferred summary',
      description: 'ignored description',
      state: 'open',
      stateHistory: [],
    });

    expect(result.affectedComponents).toEqual(['db']);
    expect(result.summary).toBe('preferred summary');
  });

  it('returns the complete stateHistory array unmodified, not just the latest entry', () => {
    const history = [
      { state: 'open', timestamp: '2026-08-01T00:00:00.000Z' },
      { state: 'investigating', timestamp: '2026-08-01T01:00:00.000Z' },
      { state: 'resolved', timestamp: '2026-08-01T02:00:00.000Z' },
    ];

    const result = serializeIncident({ id: 'inc-2', state: 'resolved', stateHistory: history });

    expect(result.stateHistory).toEqual(history);
    expect(result.stateHistory).toHaveLength(3);
  });

  it('falls back to a "status" field for state when "state" itself is absent', () => {
    const result = serializeIncident({ id: 'inc-5', status: 'resolved', stateHistory: [] });

    expect(result.state).toBe('resolved');
  });

  it('defaults affectedComponents and stateHistory to empty arrays when absent', () => {
    const result = serializeIncident({ id: 'inc-3', title: 'x', severity: 'SEV3', state: 'open' });

    expect(result.affectedComponents).toEqual([]);
    expect(result.stateHistory).toEqual([]);
  });

  it('returns exactly the seven required fields', () => {
    const result = serializeIncident({
      id: 'inc-4',
      title: 't',
      severity: 'SEV1',
      state: 'open',
      stateHistory: [],
    });

    expect(Object.keys(result).sort()).toEqual([...REQUIRED_FIELDS].sort());
  });
});

describe('GET /api/incidents', () => {
  it('returns 200 with the full list of seeded incidents on a fresh install', async () => {
    const { app } = seededApp();
    const seedIncidents = loadSeedIncidents();

    const res = await request(app).get('/api/incidents');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(seedIncidents.length);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(
      seedIncidents.map((incident) => incident.id).sort()
    );
  });

  it('every returned incident includes the required serializer fields', async () => {
    const { app } = seededApp();

    const res = await request(app).get('/api/incidents');

    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((incident) => {
      expect(Object.keys(incident).sort()).toEqual([...REQUIRED_FIELDS].sort());
      expect(typeof incident.id).toBe('string');
      expect(typeof incident.title).toBe('string');
      expect(typeof incident.severity).toBe('string');
      expect(typeof incident.summary).toBe('string');
      expect(typeof incident.state).toBe('string');
      expect(Array.isArray(incident.stateHistory)).toBe(true);
      expect(incident.stateHistory.length).toBeGreaterThan(0);
    });
  });
});

describe('GET /api/incidents/:id', () => {
  it('returns a single seeded incident with a populated stateHistory array', async () => {
    const { app } = seededApp();
    const [seedIncident] = loadSeedIncidents();

    const res = await request(app).get(`/api/incidents/${seedIncident.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seedIncident.id);
    expect(res.body.title).toBe(seedIncident.title);
    expect(res.body.severity).toBe(seedIncident.severity);
    expect(res.body.state).toBe(seedIncident.state);
    expect(res.body.stateHistory).toEqual([{ state: seedIncident.state, timestamp: seedIncident.created_at }]);
  });

  it('returns the complete stateHistory across multiple transitions, not a summarized/latest-only version', async () => {
    const db = initDatabase();
    db.prepare(
      `INSERT INTO components (id, name, description, created_at)
       VALUES ('comp-1', 'API', 'Core API', '2026-08-01T00:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
       VALUES ('inc-1', 'API latency spike', 'x', 'SEV2', 'identified', 'comp-1', '2026-08-01T00:00:00.000Z', '2026-08-01T02:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES ('inc-1', 'open', 'investigating', '2026-08-01T01:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES ('inc-1', 'investigating', 'identified', '2026-08-01T02:00:00.000Z')`
    ).run();

    const res = await request(buildApp(db)).get('/api/incidents/inc-1');

    expect(res.status).toBe(200);
    expect(res.body.stateHistory).toEqual([
      { state: 'open', timestamp: '2026-08-01T00:00:00.000Z' },
      { state: 'investigating', timestamp: '2026-08-01T01:00:00.000Z' },
      { state: 'identified', timestamp: '2026-08-01T02:00:00.000Z' },
    ]);
  });

  it('does not duplicate the initial state when the earliest transition already records creation (NULL from_state)', async () => {
    const db = initDatabase();
    db.prepare(
      `INSERT INTO components (id, name, description, created_at)
       VALUES ('comp-1', 'API', 'Core API', '2026-08-01T00:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
       VALUES ('inc-2', 'API latency spike', 'x', 'SEV2', 'investigating', 'comp-1', '2026-08-01T00:00:00.000Z', '2026-08-01T01:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES ('inc-2', NULL, 'open', '2026-08-01T00:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES ('inc-2', 'open', 'investigating', '2026-08-01T01:00:00.000Z')`
    ).run();

    const res = await request(buildApp(db)).get('/api/incidents/inc-2');

    expect(res.status).toBe(200);
    expect(res.body.stateHistory).toEqual([
      { state: 'open', timestamp: '2026-08-01T00:00:00.000Z' },
      { state: 'investigating', timestamp: '2026-08-01T01:00:00.000Z' },
    ]);
  });

  it('returns 404 with a JSON error body for an id that does not exist', async () => {
    const { app } = seededApp();

    const res = await request(app).get('/api/incidents/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Incident not found' });
  });

  it('is not shadowed by the "/export" route registered on the same router', async () => {
    const { app } = seededApp();

    const res = await request(app).get('/api/incidents/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
  });
});
