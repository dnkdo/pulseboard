// Incident state-transition API client — thin wrapper around the sequential
// transition endpoint (PATCH /api/incidents/:id, validated server-side by
// isValidTransition in src/lib/incidentState.js; see
// server/src/routes/incidents.js). Mirrors the request/error shape of
// src/api/incidents.js's createIncident so both API modules read the same
// way to callers.
import { apiFetch, ApiError } from './httpClient.js';

export async function postIncidentTransition(incidentId, nextState) {
  const response = await apiFetch(`/incidents/${encodeURIComponent(incidentId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: nextState }),
  });

  if (!response.ok) {
    let message = `Failed to transition incident ${incidentId} to '${nextState}' (status ${response.status})`;
    const body = await response.json().catch(() => null);
    if (body?.error) {
      message = body.error;
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}

export default postIncidentTransition;
