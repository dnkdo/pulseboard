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
