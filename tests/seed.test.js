import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase } from '../src/models/db.js';
import { SEVERITIES, INCIDENT_STATES } from '../src/models/schema.js';
import {
  isFreshDatabase,
  seedDatabase,
  seedIfFresh,
  loadSeedComponents,
  loadSeedIncidents,
} from '../src/models/seed.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const tempFiles = [];

afterEach(() => {
  while (tempFiles.length) {
    const file = tempFiles.pop();
    fs.rmSync(file, { force: true });
  }
});

function tempDbPath() {
  const file = path.join(os.tmpdir(), `plb-67-${Math.random().toString(36).slice(2)}.sqlite`);
  tempFiles.push(file);
  return file;
}

describe('seed fixture files', () => {
  it('components fixture is a non-empty array of at least 4 well-shaped components', () => {
    const components = loadSeedComponents();
    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThanOrEqual(4);
    for (const component of components) {
      expect(typeof component.id).toBe('string');
      expect(component.id.length).toBeGreaterThan(0);
      expect(typeof component.name).toBe('string');
      expect(typeof component.created_at).toBe('string');
    }
    const ids = components.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('incidents fixture entries reference only canonical SEVERITIES and INCIDENT_STATES values', () => {
    const incidents = loadSeedIncidents();
    expect(Array.isArray(incidents)).toBe(true);
    for (const incident of incidents) {
      expect(SEVERITIES).toContain(incident.severity);
      expect(INCIDENT_STATES).toContain(incident.state);
      expect(typeof incident.id).toBe('string');
      expect(typeof incident.component_id).toBe('string');
      expect(typeof incident.created_at).toBe('string');
      expect(typeof incident.updated_at).toBe('string');
    }
    const ids = incidents.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('incidents fixture covers all 4 defined states', () => {
    const incidents = loadSeedIncidents();
    const states = new Set(incidents.map((i) => i.state));
    for (const state of INCIDENT_STATES) {
      expect(states.has(state)).toBe(true);
    }
  });

  it('incidents fixture covers all 3 defined severities across more than one component', () => {
    const incidents = loadSeedIncidents();
    const severities = new Set(incidents.map((i) => i.severity));
    for (const severity of SEVERITIES) {
      expect(severities.has(severity)).toBe(true);
    }
    const distinctComponents = new Set(incidents.map((i) => i.component_id));
    expect(distinctComponents.size).toBeGreaterThan(1);
  });
});

describe('isFreshDatabase', () => {
  it('returns true for a newly-initialized, unseeded database', () => {
    const db = initDatabase();
    expect(isFreshDatabase(db)).toBe(true);
  });

  it('returns false once seedDatabase() has populated the database', () => {
    const db = initDatabase();
    seedDatabase(db);
    expect(isFreshDatabase(db)).toBe(false);
  });
});

describe('seedDatabase', () => {
  it('inserts at least one incident in each of the 4 defined states (acceptance criterion)', () => {
    const db = initDatabase();
    seedDatabase(db);

    const rows = db.prepare('SELECT DISTINCT state FROM incidents').all();
    const seededStates = rows.map((row) => row.state);

    for (const state of INCIDENT_STATES) {
      expect(seededStates).toContain(state);
    }
  });

  it('inserts at least one incident of each of the 3 defined severities, spanning more than one component (acceptance criterion)', () => {
    const db = initDatabase();
    seedDatabase(db);

    const severityRows = db.prepare('SELECT DISTINCT severity FROM incidents').all();
    const seededSeverities = severityRows.map((row) => row.severity);
    for (const severity of SEVERITIES) {
      expect(seededSeverities).toContain(severity);
    }

    const componentRows = db.prepare('SELECT DISTINCT component_id FROM incidents').all();
    expect(componentRows.length).toBeGreaterThan(1);

    const severityComponentPairs = db
      .prepare('SELECT DISTINCT severity, component_id FROM incidents')
      .all();
    const componentsPerSeverity = new Map();
    for (const { severity, component_id: componentId } of severityComponentPairs) {
      if (!componentsPerSeverity.has(severity)) {
        componentsPerSeverity.set(severity, new Set());
      }
      componentsPerSeverity.get(severity).add(componentId);
    }
    // Every severity must itself span more than one component, not just the
    // dataset as a whole — otherwise "spread across components" could be
    // satisfied by e.g. all SEV3s sitting on a single component.
    for (const severity of SEVERITIES) {
      expect(componentsPerSeverity.get(severity)?.size).toBeGreaterThan(1);
    }
  });

  it('rejects a second direct seedDatabase() call on an already-seeded database (primary keys are fixed, not randomly generated)', () => {
    const db = initDatabase();
    seedDatabase(db);
    expect(() => seedDatabase(db)).toThrow();
  });
});

describe('seedIfFresh (startup orchestration)', () => {
  it('seeds an empty database and reports seeded: true', () => {
    const db = initDatabase();
    const result = seedIfFresh(db);
    expect(result.seeded).toBe(true);
    expect(isFreshDatabase(db)).toBe(false);
  });

  it('is idempotent — calling it twice does not double the row counts', () => {
    const db = initDatabase();

    const first = seedIfFresh(db);
    const componentCountAfterFirst = db
      .prepare('SELECT COUNT(*) AS count FROM components')
      .get().count;
    const incidentCountAfterFirst = db
      .prepare('SELECT COUNT(*) AS count FROM incidents')
      .get().count;

    const second = seedIfFresh(db);
    const componentCountAfterSecond = db
      .prepare('SELECT COUNT(*) AS count FROM components')
      .get().count;
    const incidentCountAfterSecond = db
      .prepare('SELECT COUNT(*) AS count FROM incidents')
      .get().count;

    expect(first.seeded).toBe(true);
    expect(second.seeded).toBe(false);
    expect(componentCountAfterSecond).toBe(componentCountAfterFirst);
    expect(incidentCountAfterSecond).toBe(incidentCountAfterFirst);
    expect(componentCountAfterFirst).toBeGreaterThan(0);
    expect(incidentCountAfterFirst).toBeGreaterThan(0);
  });

  it('does not seed a database that already has manually-inserted data, even if incidents table is still empty', () => {
    const db = initDatabase();
    db.prepare(
      "INSERT INTO components (id, name, description, created_at) VALUES ('manual-comp', 'Manual', 'x', '2026-08-01T00:00:00.000Z')",
    ).run();

    const result = seedIfFresh(db);
    expect(result.seeded).toBe(false);

    const incidentCount = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;
    expect(incidentCount).toBe(0);
  });
});

describe('automatic seeding on a true fresh install (end-to-end)', () => {
  it('boots the real app entry point against a nonexistent db file with zero manual setup steps, and ends up seeded', () => {
    const dbPath = tempDbPath();
    expect(fs.existsSync(dbPath)).toBe(false);

    execFileSync(process.execPath, [path.join(repoRoot, 'src/index.js')], {
      env: { ...process.env, PLB_DB_PATH: dbPath },
      cwd: repoRoot,
    });

    expect(fs.existsSync(dbPath)).toBe(true);

    const db = new Database(dbPath, { readonly: true });
    const componentCount = db.prepare('SELECT COUNT(*) AS count FROM components').get().count;
    const incidentCount = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;
    expect(componentCount).toBeGreaterThanOrEqual(4);
    expect(incidentCount).toBeGreaterThan(0);

    const states = db
      .prepare('SELECT DISTINCT state FROM incidents')
      .all()
      .map((r) => r.state);
    for (const state of INCIDENT_STATES) {
      expect(states).toContain(state);
    }
    const severities = db
      .prepare('SELECT DISTINCT severity FROM incidents')
      .all()
      .map((r) => r.severity);
    for (const severity of SEVERITIES) {
      expect(severities).toContain(severity);
    }
    db.close();
  });

  it('running the entry point twice against the same file does not double-seed (second boot is a no-op)', () => {
    const dbPath = tempDbPath();

    execFileSync(process.execPath, [path.join(repoRoot, 'src/index.js')], {
      env: { ...process.env, PLB_DB_PATH: dbPath },
      cwd: repoRoot,
    });
    execFileSync(process.execPath, [path.join(repoRoot, 'src/index.js')], {
      env: { ...process.env, PLB_DB_PATH: dbPath },
      cwd: repoRoot,
    });

    const db = new Database(dbPath, { readonly: true });
    const incidentCount = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;
    const seedIncidentTotal = loadSeedIncidents().length;
    expect(incidentCount).toBe(seedIncidentTotal);
    db.close();
  });
});
