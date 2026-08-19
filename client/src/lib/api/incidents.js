// Thin fetch wrapper for GET /api/incidents, mirroring fetchComponents.js.
//
// The server serializes incidents with `state`/`stateHistory`
// (src/controllers/incidentsController.js), but every client-side pure
// function that consumes incidents — filterActiveIncidents,
// sortPastIncidentsDesc, computeOverallStatus (src/lib/incidents.js,
// src/lib/status.js) — reads `.status`/`.resolvedAt`. Left unnormalized,
// past incidents never match `status === 'resolved'` and silently vanish
// from the public status page. This wrapper is the seam where the server's
// shape gets adapted to the client's, so every caller downstream can stay
// on the `.status`/`.resolvedAt` vocabulary.
function deriveResolvedAt(incident) {
  if (incident.resolvedAt) {
    return incident.resolvedAt;
  }

  const history = Array.isArray(incident.stateHistory) ? incident.stateHistory : [];
  const resolvedEntry = [...history].reverse().find((entry) => entry?.state === 'resolved');
  return resolvedEntry?.timestamp ?? null;
}

// Exported so integration tests can reuse this exact server-shape-to-client-shape
// seam (rather than re-deriving `.status`/`.resolvedAt` themselves) when asserting
// on the public status page's data source.
export function normalizeIncident(incident) {
  return {
    ...incident,
    status: incident.status ?? incident.state ?? null,
    resolvedAt: deriveResolvedAt(incident),
  };
}

export async function fetchIncidents() {
  const response = await fetch('/api/incidents');

  if (!response.ok) {
    throw new Error(`Failed to fetch incidents: ${response.status}`);
  }

  const data = await response.json();
  return data.map(normalizeIncident);
}

// GET /api/incidents/:id (src/controllers/incidentsController.js) returns
// the full internal incident record — no public-field filtering — with
// `state`/`stateHistory` in the same server shape fetchIncidents normalizes
// above, so this goes through the same seam. Returns null on 404 rather
// than throwing, so callers (IncidentDetailPage) can distinguish "no such
// incident" from a network/server failure without parsing error bodies.
export async function getIncidentById(id) {
  const response = await fetch(`/api/incidents/${id}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch incident ${id}: ${response.status}`);
  }

  const data = await response.json();
  return normalizeIncident(data);
}
