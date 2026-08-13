import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from '../db.js';
import entrypointDb from '../../index.js';

const tempFiles = [];

afterEach(() => {
  while (tempFiles.length) {
    const file = tempFiles.pop();
    fs.rmSync(file, { force: true });
  }
});

function tempDbPath() {
  const file = path.join(os.tmpdir(), `plb-66-${Math.random().toString(36).slice(2)}.sqlite`);
  tempFiles.push(file);
  return file;
}

function tableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);
}

describe('initDatabase', () => {
  it('returns a working better-sqlite3 handle', () => {
    const db = initDatabase();
    expect(() => db.prepare('SELECT 1 AS ok').get()).not.toThrow();
    expect(db.prepare('SELECT 1 AS ok').get()).toEqual({ ok: 1 });
  });

  it('auto-creates incidents, components, and incident_state_transitions tables with zero manual setup', () => {
    const db = initDatabase();
    const names = tableNames(db);
    expect(names).toEqual(expect.arrayContaining(['incidents', 'components', 'incident_state_transitions']));
  });

  it('is idempotent — calling the factory again on the same file path does not throw or duplicate tables', () => {
    const dbPath = tempDbPath();
    const first = initDatabase(dbPath);
    const namesBefore = tableNames(first);
    first.close();

    expect(() => initDatabase(dbPath)).not.toThrow();
    const second = initDatabase(dbPath);
    const namesAfter = tableNames(second);
    second.close();

    expect(namesAfter).toEqual(namesBefore);
    expect(namesAfter).toEqual(
      expect.arrayContaining(['components', 'incident_state_transitions', 'incidents'])
    );
  });

  it('rejects an incident insert with an invalid severity via the CHECK constraint', () => {
    const db = initDatabase();
    db.prepare(
      "INSERT INTO components (id, name, description, created_at) VALUES ('comp-1', 'API', 'Core API', '2026-08-01T00:00:00.000Z')"
    ).run();

    expect(() =>
      db
        .prepare(
          `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
           VALUES ('inc-1', 'Bad severity', 'x', 'SEV9', 'open', 'comp-1', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')`
        )
        .run()
    ).toThrow(/CHECK constraint failed/);
  });

  it('rejects an incident insert with an invalid state via the CHECK constraint', () => {
    const db = initDatabase();
    db.prepare(
      "INSERT INTO components (id, name, description, created_at) VALUES ('comp-1', 'API', 'Core API', '2026-08-01T00:00:00.000Z')"
    ).run();

    expect(() =>
      db
        .prepare(
          `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
           VALUES ('inc-1', 'Bad state', 'x', 'SEV1', 'archived', 'comp-1', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')`
        )
        .run()
    ).toThrow(/CHECK constraint failed/);
  });

  it('round-trips a valid incident and state transition through the component/incident FK relationships', () => {
    const db = initDatabase();

    db.prepare(
      "INSERT INTO components (id, name, description, created_at) VALUES ('comp-1', 'API', 'Core API', '2026-08-01T00:00:00.000Z')"
    ).run();

    db.prepare(
      `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
       VALUES ('inc-1', 'API latency spike', 'Elevated p99', 'SEV2', 'open', 'comp-1', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')`
    ).run();

    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES ('inc-1', NULL, 'open', '2026-08-01T00:00:00.000Z')`
    ).run();
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES ('inc-1', 'open', 'investigating', '2026-08-01T00:10:00.000Z')`
    ).run();

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get('inc-1');
    expect(incident).toMatchObject({
      id: 'inc-1',
      severity: 'SEV2',
      state: 'open',
      component_id: 'comp-1',
    });

    const transitions = db
      .prepare('SELECT * FROM incident_state_transitions WHERE incident_id = ? ORDER BY id')
      .all('inc-1');
    expect(transitions).toHaveLength(2);
    expect(transitions[1]).toMatchObject({ from_state: 'open', to_state: 'investigating' });
  });

  it('auto-initializes on process startup via src/index.js with no manual initDatabase() call', () => {
    const names = tableNames(entrypointDb);
    expect(names).toEqual(
      expect.arrayContaining(['components', 'incident_state_transitions', 'incidents'])
    );
    expect(() => entrypointDb.prepare('SELECT 1 AS ok').get()).not.toThrow();
  });

  it('defaults a new incident to the first workflow state when state is omitted', () => {
    const db = initDatabase();
    db.prepare(
      "INSERT INTO components (id, name, description, created_at) VALUES ('comp-1', 'API', 'Core API', '2026-08-01T00:00:00.000Z')"
    ).run();

    db.prepare(
      `INSERT INTO incidents (id, title, description, severity, component_id, created_at, updated_at)
       VALUES ('inc-2', 'Default state check', 'x', 'SEV3', 'comp-1', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')`
    ).run();

    const incident = db.prepare('SELECT state FROM incidents WHERE id = ?').get('inc-2');
    expect(incident.state).toBe('open');
  });
});
