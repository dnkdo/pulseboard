// In-memory incident store shared by the POST and GET route handlers within
// a single Node process. No external DB is configured for this stack (per
// CLAUDE.md), so this module is the single source of truth for incidents —
// synchronous access here is what guarantees a newly created incident is
// immediately visible to GET /api/incidents with no artificial delay.
let incidents = [];
let nextId = 1;

export function createIncident(fields, { now = () => new Date().toISOString() } = {}) {
  const incident = {
    id: String(nextId++),
    title: fields.title,
    severity: fields.severity,
    affected_components: fields.affected_components,
    summary: fields.summary,
    state: 'open',
    createdAt: now(),
  };
  incidents.push(incident);
  return incident;
}

export function getAllIncidents() {
  return incidents;
}

// Test-only helper: resets module-level state between test cases so
// incident IDs and list contents don't leak across independent test runs.
export function resetIncidentStore() {
  incidents = [];
  nextId = 1;
}
