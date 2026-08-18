// Shared active/past incident partitioning — the single source both the
// internal dashboard and the public status page read from, so they never
// diverge on what counts as "still ongoing" vs "resolved".
//
// Incident state is read from `state` or `status` (same dual-field
// precedent as src/lib/stats.js#isResolved: SQLite rows use `state`, other
// producers use `status`), normalized case-insensitively/trimmed so
// 'Resolved', ' resolved ', etc. all count as the terminal state.
const RESOLVED_STATE = 'resolved';

function isResolvedIncident(incident) {
  const raw = incident?.state ?? incident?.status;
  if (typeof raw !== 'string') {
    return false;
  }
  return raw.trim().toLowerCase() === RESOLVED_STATE;
}

// Returns { active, past } — new arrays, never mutating `incidents` or its
// elements. Recomputed fresh from whatever list is passed in on every call
// (no caching/memoization), so a resolved incident moves from active to
// past on the very next call with no additional delay. Order within each
// partition mirrors the input order.
export function partitionIncidents(incidents) {
  if (!Array.isArray(incidents)) {
    throw new TypeError('partitionIncidents expects an array of incidents');
  }

  const active = [];
  const past = [];

  for (const incident of incidents) {
    if (isResolvedIncident(incident)) {
      past.push(incident);
    } else {
      active.push(incident);
    }
  }

  return { active, past };
}

export default partitionIncidents;
