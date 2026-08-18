// Incident detail API client — fetches a single incident (with its full
// transition history) for the internal dashboard's detail view.
//
// Deliberately does NOT filter public vs. internal fields; that's a separate
// concern owned by filterPublicIncidentFields (see src/utils/incidentVisibility.js)
// and applied by consumers of this function, not here.

import { apiFetch, ApiError } from './httpClient.js';

// Native Array#sort is a stable sort, so returning 0 for equal/invalid
// timestamps preserves the incoming order instead of scrambling it.
function sortTransitionsAscending(transitions) {
  return [...transitions].sort((a, b) => {
    const aTime = new Date(a?.timestamp).getTime();
    const bTime = new Date(b?.timestamp).getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return 0;
    }
    return aTime - bTime;
  });
}

export async function getIncidentById(id) {
  const response = await apiFetch(`/incidents/${encodeURIComponent(id)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError(`Failed to fetch incident ${id}: ${response.status}`, response.status);
  }

  const incident = await response.json();

  if (!Array.isArray(incident.transitions)) {
    return incident;
  }

  return {
    ...incident,
    transitions: sortTransitionsAscending(incident.transitions),
  };
}

// Declares a new incident via POST /api/incidents. Accepts the camelCase
// `affectedComponents` shape used throughout the internal dashboard (see
// serializeIncident in src/controllers/incidentsController.js) and translates
// it to the `affected_components` field name the Express route
// (server/src/routes/incidents.js) actually validates and stores.
export async function createIncident({ title, severity, affectedComponents, summary }) {
  const response = await apiFetch('/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      severity,
      affected_components: affectedComponents,
      summary,
    }),
  });

  if (!response.ok) {
    let message = `Failed to create incident (status ${response.status})`;
    const body = await response.json().catch(() => null);
    if (body?.errors) {
      message = Object.values(body.errors).join(' ');
    } else if (body?.error) {
      message = body.error;
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}
