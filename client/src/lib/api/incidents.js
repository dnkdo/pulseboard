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

function normalizeIncident(incident) {
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
