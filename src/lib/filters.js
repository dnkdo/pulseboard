// Pure component filter for the internal dashboard's incident list and
// timeline (shared via src/state/IncidentFilterContext.jsx so both views
// stay in sync off a single selection).
//
// Incidents may carry the affected component as `componentId` (the shape
// this function's own test contract — .adlc/testcases.yaml — asserts
// against), the DB column's `component_id` (src/data/seed/incidents.json),
// or a plural `affectedComponents` array (the API's serialized shape, see
// src/controllers/incidentsController.js). All three are checked so the
// same filter works against seed rows, API responses, and hand-built test
// fixtures without callers needing to normalize field names first.
function incidentReferencesComponent(incident, componentId) {
  if (incident?.componentId === componentId) {
    return true;
  }
  if (incident?.component_id === componentId) {
    return true;
  }
  if (Array.isArray(incident?.affectedComponents) && incident.affectedComponents.includes(componentId)) {
    return true;
  }
  return false;
}

// Returns a new array — never mutates `incidents` — of incidents that
// reference `componentId`. A componentId of 'all' (or null/undefined)
// returns the full incident list unfiltered, since that's the "no filter
// applied" selector in the filter control UI.
export function filterIncidentsByComponent(incidents, componentId) {
  if (!Array.isArray(incidents)) {
    return [];
  }

  if (componentId == null || componentId === 'all') {
    return [...incidents];
  }

  return incidents.filter((incident) => incidentReferencesComponent(incident, componentId));
}

export default filterIncidentsByComponent;
