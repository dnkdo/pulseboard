// Deterministic seed data loader — reads the hand-curated JSON fixtures in
// src/data/seed/ and populates an empty database. No random IDs, no
// Date.now()/new Date(); every timestamp in the fixtures is a fixed ISO string.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SEED_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'seed');

function loadSeedFile(filename) {
  const filePath = path.join(SEED_DIR, filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function loadSeedComponents() {
  return loadSeedFile('components.json');
}

export function loadSeedIncidents() {
  return loadSeedFile('incidents.json');
}

// A database counts as "fresh" only when both tables are empty — a partially
// populated database (e.g. components inserted but incidents missing) is
// treated as already-seeded rather than re-seeded, to avoid duplicate-key
// errors on a second pass.
export function isFreshDatabase(db) {
  const { count: componentCount } = db.prepare('SELECT COUNT(*) AS count FROM components').get();
  const { count: incidentCount } = db.prepare('SELECT COUNT(*) AS count FROM incidents').get();
  return componentCount === 0 && incidentCount === 0;
}

// Inserts the full seed dataset inside a single transaction so a fresh
// install ends up either fully seeded or not seeded at all, never partial.
export function seedDatabase(db) {
  const components = loadSeedComponents();
  const incidents = loadSeedIncidents();

  const insertComponent = db.prepare(
    `INSERT INTO components (id, name, description, created_at)
     VALUES (@id, @name, @description, @created_at)`,
  );
  const insertIncident = db.prepare(
    `INSERT INTO incidents (id, title, description, severity, state, component_id, created_at, updated_at)
     VALUES (@id, @title, @description, @severity, @state, @component_id, @created_at, @updated_at)`,
  );

  const runSeed = db.transaction(() => {
    for (const component of components) {
      insertComponent.run(component);
    }
    for (const incident of incidents) {
      insertIncident.run(incident);
    }
  });

  runSeed();

  return { componentCount: components.length, incidentCount: incidents.length };
}

// Orchestration helper used by application startup: seeds only when the
// database is empty, otherwise it's a no-op — safe to call on every boot.
export function seedIfFresh(db) {
  if (!isFreshDatabase(db)) {
    return { seeded: false };
  }

  const result = seedDatabase(db);
  return { seeded: true, ...result };
}

export default seedIfFresh;
