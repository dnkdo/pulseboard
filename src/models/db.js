import Database from 'better-sqlite3';
import { SEVERITIES, INCIDENT_STATES } from './schema.js';

function toSqlEnumList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

function buildSchemaSql() {
  const severityCheck = toSqlEnumList(SEVERITIES);
  const stateCheck = toSqlEnumList(INCIDENT_STATES);
  const defaultState = INCIDENT_STATES[0];

  return `
    CREATE TABLE IF NOT EXISTS components (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL CHECK (severity IN (${severityCheck})),
      state TEXT NOT NULL DEFAULT '${defaultState}' CHECK (state IN (${stateCheck})),
      component_id TEXT REFERENCES components(id),
      -- JSON-encoded free-form component list (string or array) accepted by
      -- POST /api/incidents; distinct from component_id, which is a strict FK
      -- used by seeded/dashboard incidents tied to exactly one component.
      affected_components TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incident_state_transitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      from_state TEXT CHECK (from_state IS NULL OR from_state IN (${stateCheck})),
      to_state TEXT NOT NULL CHECK (to_state IN (${stateCheck})),
      transitioned_at TEXT NOT NULL
    );
  `;
}

// Idempotent: CREATE TABLE IF NOT EXISTS means repeated calls (e.g. on every
// process startup) are safe no-ops rather than requiring a separate migration
// step. Automatic invocation on startup is wired in src/index.js.
export function initDatabase(dbPath = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(buildSchemaSql());
  return db;
}

export default initDatabase;
