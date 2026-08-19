// PLB-122: server/db/seedLoader.js is an adapter over the canonical seed
// dataset/loader (src/data/seed/*.json, src/models/seed.js — built for
// PLB-66/PLB-67), exposed under the module path this task's test contract
// requires. These tests bind the loadSeedDataIfEmpty acceptance criteria
// directly to real better-sqlite3 databases rather than mocking internals.
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from '../src/models/db.js';
import { SEVERITIES, INCIDENT_STATES } from '../src/models/schema.js';
import { loadSeedDataIfEmpty } from '../server/db/seedLoader.js';

function distinctColumn(db, column) {
  return db
    .prepare(`SELECT DISTINCT ${column} FROM incidents`)
    .all()
    .map((row) => row[column]);
}

describe('loadSeedDataIfEmpty (server/db/seedLoader.js)', () => {
  it('seeds a fresh in-memory database and reports non-zero component/incident counts', () => {
    const db = initDatabase();

    const result = loadSeedDataIfEmpty(db);

    expect(result.seeded).toBe(true);
    expect(result.componentCount).toBeGreaterThan(0);
    expect(result.incidentCount).toBeGreaterThan(0);

    const componentCount = db.prepare('SELECT COUNT(*) AS count FROM components').get().count;
    const incidentCount = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;
    expect(componentCount).toBeGreaterThan(0);
    expect(incidentCount).toBeGreaterThan(0);
  });

  it('AC1: seeded incidents cover all 4 defined states', () => {
    const db = initDatabase();
    loadSeedDataIfEmpty(db);

    const seededStates = distinctColumn(db, 'state');
    for (const state of INCIDENT_STATES) {
      expect(seededStates).toContain(state);
    }
  });

  it('AC2: seeded incidents cover all 3 defined severities, spread across more than one component', () => {
    const db = initDatabase();
    loadSeedDataIfEmpty(db);

    const seededSeverities = distinctColumn(db, 'severity');
    for (const severity of SEVERITIES) {
      expect(seededSeverities).toContain(severity);
    }

    const distinctComponents = db
      .prepare('SELECT DISTINCT component_id FROM incidents')
      .all();
    expect(distinctComponents.length).toBeGreaterThan(1);
  });

  it('AC3: calling it twice against the same database is idempotent (no duplicate rows, no throw)', () => {
    const db = initDatabase();

    const first = loadSeedDataIfEmpty(db);
    const componentsAfterFirst = db.prepare('SELECT COUNT(*) AS count FROM components').get().count;
    const incidentsAfterFirst = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;

    expect(() => loadSeedDataIfEmpty(db)).not.toThrow();
    const second = loadSeedDataIfEmpty(db);

    const componentsAfterSecond = db.prepare('SELECT COUNT(*) AS count FROM components').get().count;
    const incidentsAfterSecond = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;

    expect(first.seeded).toBe(true);
    expect(second.seeded).toBe(false);
    expect(componentsAfterSecond).toBe(componentsAfterFirst);
    expect(incidentsAfterSecond).toBe(incidentsAfterFirst);
  });

  it('does not seed on top of a database that already has manually-inserted data', () => {
    const db = initDatabase();
    db.prepare(
      "INSERT INTO components (id, name, description, created_at) VALUES ('manual-comp', 'Manual', 'x', '2026-08-01T00:00:00.000Z')",
    ).run();

    const result = loadSeedDataIfEmpty(db);

    expect(result.seeded).toBe(false);
    const incidentCount = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;
    expect(incidentCount).toBe(0);
    const componentCount = db.prepare('SELECT COUNT(*) AS count FROM components').get().count;
    expect(componentCount).toBe(1);
  });

  describe('string-identifier form (zero-manual-step fresh install, no db handle available)', () => {
    const tempFiles = [];

    afterEach(() => {
      while (tempFiles.length) {
        fs.rmSync(tempFiles.pop(), { force: true });
      }
    });

    it('loadSeedDataIfEmpty("freshEmptyDb") opens/creates a real database and returns a result object (test contract)', () => {
      const dbPath = path.join(os.tmpdir(), 'freshEmptyDb.sqlite');
      fs.rmSync(dbPath, { force: true });
      tempFiles.push(dbPath);

      const result = loadSeedDataIfEmpty('freshEmptyDb');

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(result.seeded).toBe(true);
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('reuses the same on-disk database for the same identifier across calls, staying idempotent', () => {
      const identifier = `plb-122-${Math.random().toString(36).slice(2)}`;
      const dbPath = path.join(os.tmpdir(), `${identifier}.sqlite`);
      tempFiles.push(dbPath);

      const first = loadSeedDataIfEmpty(identifier);
      const second = loadSeedDataIfEmpty(identifier);

      expect(first.seeded).toBe(true);
      expect(second.seeded).toBe(false);
    });
  });

  it('falls back to a fresh in-memory database when called with no argument', () => {
    const result = loadSeedDataIfEmpty();

    expect(typeof result).toBe('object');
    expect(result.seeded).toBe(true);
    expect(result.incidentCount).toBeGreaterThan(0);
  });
});
