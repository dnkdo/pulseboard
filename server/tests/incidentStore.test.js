import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase } from '../../src/models/db.js';
import { createIncident, getAllIncidents, resetIncidentStore } from '../store/incidentStore.js';

describe('incidentStore (SQLite-backed)', () => {
  let db;

  beforeEach(() => {
    db = initDatabase();
  });

  it('createIncident persists to the incidents table and getAllIncidents reads it back', () => {
    createIncident(db, {
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      summary: 'Elevated p99 latency',
    });

    const row = db.prepare('SELECT * FROM incidents').get();
    expect(row).toMatchObject({ title: 'API latency spike', severity: 'SEV2', state: 'open' });

    const all = getAllIncidents(db);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      summary: 'Elevated p99 latency',
      state: 'open',
    });
  });

  it('round-trips a plain string affected_components value without wrapping it in an array', () => {
    const incident = createIncident(db, {
      title: 'DB outage',
      severity: 'SEV1',
      affected_components: 'db',
      summary: 'Primary DB unreachable',
    });

    expect(incident.affected_components).toBe('db');
    expect(getAllIncidents(db)[0].affected_components).toBe('db');
  });

  it('defaults affected_components to [] for rows with no value in that column (e.g. seeded/legacy data)', () => {
    db.prepare(
      `INSERT INTO incidents (id, title, description, severity, state, created_at, updated_at)
       VALUES ('seed-inc-1', 'Legacy seeded incident', 'x', 'SEV3', 'open', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
    ).run();

    const [incident] = getAllIncidents(db);
    expect(incident.affected_components).toEqual([]);
  });

  it('generates a unique id per incident so concurrent creates never collide', () => {
    const a = createIncident(db, { title: 'A', severity: 'SEV3', affected_components: ['api'], summary: 'a' });
    const b = createIncident(db, { title: 'B', severity: 'SEV3', affected_components: ['api'], summary: 'b' });

    expect(a.id).not.toBe(b.id);
  });

  it('resetIncidentStore deletes all incidents and their transitions so ids/lists never leak across tests', () => {
    const incident = createIncident(db, {
      title: 'API latency spike',
      severity: 'SEV2',
      affected_components: ['api'],
      summary: 'x',
    });
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES (?, NULL, 'open', '2026-01-01T00:00:00.000Z')`
    ).run(incident.id);

    resetIncidentStore(db);

    expect(getAllIncidents(db)).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM incident_state_transitions').get().count).toBe(0);
  });
});
