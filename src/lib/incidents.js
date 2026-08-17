// Pure filter/sort for the public status page's "active incidents" section.
// Framework-agnostic (no React imports) so it's usable from a polling hook,
// a server-rendered path, or a plain unit test without mounting anything.
//
// "Active" is defined purely by the shared status field (never a separate
// published/visible flag): anything other than the terminal 'resolved'
// state counts as active, matching the incident state machine's own
// definition of resolved (see src/lib/incidentState.js / INCIDENT_STATES).

// Ranked highest to lowest. Keyed by lowercased severity string so this
// tolerates both the canonical SEV1/SEV2/SEV3 enum (src/models/schema.js)
// and the plain-language severity vocabulary (critical/major/minor/low)
// incidents may arrive with from other producers. Unranked/unknown
// severities sort last, after 'low'.
const SEVERITY_RANK = Object.freeze({
  sev1: 4,
  critical: 4,
  sev2: 3,
  major: 3,
  sev3: 2,
  minor: 2,
  low: 1,
});

function severityRank(severity) {
  if (typeof severity !== 'string') {
    return 0;
  }
  return SEVERITY_RANK[severity.toLowerCase()] ?? 0;
}

function isActiveIncident(incident) {
  return incident?.status !== 'resolved';
}

// Returns a new array — never mutates `incidents` or its elements — of the
// non-resolved incidents, ordered by severity descending (ties keep their
// original relative order, which callers should pre-sort by start time).
export function filterActiveIncidents(incidents) {
  if (!Array.isArray(incidents)) {
    return [];
  }

  return incidents
    .filter(isActiveIncident)
    .sort((a, b) => severityRank(b?.severity) - severityRank(a?.severity));
}

export default filterActiveIncidents;
