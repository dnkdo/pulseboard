// Builds the chronological entry order for the dashboard's incident timeline.
//
// Incident timestamps show up as `created_at` (seed/db data, per
// src/data/seed/incidents.json) or `createdAt` (server/store/incidentStore.js,
// the in-memory store backing GET /api/incidents) depending on which layer
// produced the object, so both spellings are read here rather than picking one.
function getTimestampValue(incident) {
  const raw = incident?.created_at ?? incident?.createdAt;
  if (raw == null) {
    return NaN;
  }
  return new Date(raw).getTime();
}

// Returns a new array of incidents ordered ascending by creation timestamp.
// Does not mutate the input. Entries with a missing/unparseable timestamp are
// deterministically pushed to the end (in their original relative order)
// rather than sorted arbitrarily or dropped.
export function buildIncidentTimeline(incidents) {
  if (!Array.isArray(incidents)) {
    return [];
  }

  return incidents
    .map((incident, index) => ({ incident, index, time: getTimestampValue(incident) }))
    .sort((a, b) => {
      const aValid = !Number.isNaN(a.time);
      const bValid = !Number.isNaN(b.time);

      if (aValid && bValid) {
        return a.time - b.time || a.index - b.index;
      }
      if (aValid !== bValid) {
        return aValid ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.incident);
}
