// Pure aggregation of the public banner status from the incident list.
// No fetching here — the calling component owns polling; this module only
// derives a status from an already-fetched incidents array.

import { SEVERITIES } from '../models/schema.js';

// Ranked from highest to lowest severity — index 0 is the most severe.
// Sourced from the canonical SEVERITIES enum so this never drifts from
// the schema's severity values.
export const SEVERITY_ORDER = SEVERITIES;

export const SEVERITY_META = Object.freeze({
  SEV1: Object.freeze({ color: 'red', label: 'Critical Outage' }),
  SEV2: Object.freeze({ color: 'orange', label: 'Major Outage' }),
  SEV3: Object.freeze({ color: 'yellow', label: 'Minor Outage' }),
  operational: Object.freeze({ color: null, label: 'All Systems Operational' }),
});

// Any status other than the terminal 'resolved' state counts as active,
// matching the incident state machine's definition of "resolved".
function isActiveIncident(incident) {
  return incident.status !== 'resolved';
}

// Incidents with a severity outside SEVERITY_ORDER rank below all known
// severities rather than winning by an out-of-bounds index.
function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}

export function computeOverallStatus(incidents) {
  const active = (incidents || []).filter(isActiveIncident);

  if (active.length === 0) {
    return {
      status: 'operational',
      severity: null,
      color: SEVERITY_META.operational.color,
      label: SEVERITY_META.operational.label,
    };
  }

  const highest = active.reduce((worst, incident) =>
    severityRank(incident.severity) < severityRank(worst.severity) ? incident : worst
  );

  const meta = SEVERITY_META[highest.severity];

  return {
    status: highest.severity,
    severity: highest.severity,
    color: meta.color,
    label: meta.label,
  };
}
