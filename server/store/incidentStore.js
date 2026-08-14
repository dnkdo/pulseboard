// Incident data-access layer backed by the shared SQLite database (see
// src/models/db.js) — the single source of truth for incidents, so a POST
// here and the PATCH /:id transition handler (server/src/routes/incidents.js)
// and computeStatCards (src/lib/stats.js) all read/write the same rows.
// Every function takes `db` explicitly so route factories and tests can pass
// either the app's shared singleton (src/index.js) or an isolated test db.
import crypto from 'node:crypto';

function rowToIncident(row) {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    affected_components: row.affected_components === null ? [] : JSON.parse(row.affected_components),
    summary: row.description,
    state: row.state,
    createdAt: row.created_at,
  };
}

export function createIncident(db, fields, { now = () => new Date().toISOString() } = {}) {
  const id = crypto.randomUUID();
  const createdAt = now();

  db.prepare(
    `INSERT INTO incidents (id, title, description, severity, state, component_id, affected_components, created_at, updated_at)
     VALUES (@id, @title, @description, @severity, 'open', NULL, @affectedComponents, @createdAt, @createdAt)`
  ).run({
    id,
    title: fields.title,
    description: fields.summary,
    severity: fields.severity,
    affectedComponents: JSON.stringify(fields.affected_components),
    createdAt,
  });

  return rowToIncident(db.prepare('SELECT * FROM incidents WHERE id = ?').get(id));
}

export function getAllIncidents(db) {
  return db.prepare('SELECT * FROM incidents ORDER BY created_at ASC').all().map(rowToIncident);
}

// Test-only helper: clears every incident (and its transitions) from the
// given db so incident lists and ids don't leak across independent test
// cases. Transitions are deleted first to satisfy the incident_id FK.
export function resetIncidentStore(db) {
  db.exec('DELETE FROM incident_state_transitions; DELETE FROM incidents;');
}
