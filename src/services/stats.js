// Pure aggregate-stat functions for GET /api/stats — exact (non-windowed)
// counterparts to the 7-day/30-day windowed values in src/lib/stats.js.
// Incident shape isn't fully pinned down across callers (raw SQLite rows use
// `state`/`created_at`/`updated_at`; API-shaped fixtures use
// `state`/`createdAt`/`stateHistory`), so every accessor here is defensive
// about field-naming drift the same way src/lib/stats.js already is.

function getState(incident) {
  return incident.state ?? incident.status ?? null;
}

function isResolved(incident) {
  return getState(incident) === 'resolved';
}

function getStateHistory(incident) {
  return incident.stateHistory ?? incident.state_history ?? [];
}

function getCreatedAt(incident) {
  const history = getStateHistory(incident);
  return incident.createdAt ?? incident.created_at ?? history[0]?.timestamp ?? null;
}

// resolved is a terminal state (no further transitions), so a resolved
// incident's last stateHistory entry / updated_at is equivalent to its
// resolution time — same assumption src/lib/stats.js makes.
function getResolvedAt(incident) {
  if (!isResolved(incident)) {
    return null;
  }

  const history = getStateHistory(incident);
  const resolvedEntry = [...history].reverse().find((entry) => entry.state === 'resolved');

  return (
    incident.resolvedAt ??
    incident.resolved_at ??
    resolvedEntry?.timestamp ??
    incident.updatedAt ??
    incident.updated_at ??
    null
  );
}

// Exact mean time-to-resolution in minutes across every resolved incident in
// the array (no time-window clipping). Returns 0, not NaN, when there are no
// resolved incidents with resolvable timestamps.
export function computeMTTR(incidents = []) {
  const durationsMinutes = incidents
    .filter(isResolved)
    .map((incident) => {
      const createdAt = getCreatedAt(incident);
      const resolvedAt = getResolvedAt(incident);
      if (!createdAt || !resolvedAt) {
        return null;
      }
      return (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000;
    })
    .filter((duration) => duration !== null);

  if (durationsMinutes.length === 0) {
    return 0;
  }

  return durationsMinutes.reduce((sum, duration) => sum + duration, 0) / durationsMinutes.length;
}

// Exact count of incidents not in the resolved state (no time-window clipping).
export function computeOpenCount(incidents = []) {
  return incidents.filter((incident) => !isResolved(incident)).length;
}

// Exact count of incidents whose createdAt falls in the same UTC calendar
// month AND year as referenceDate. referenceDate must be supplied by the
// caller (route layer) — this function never reads the system clock.
export function computeIncidentsThisMonth(incidents = [], referenceDate) {
  const reference = new Date(referenceDate);
  const referenceYear = reference.getUTCFullYear();
  const referenceMonth = reference.getUTCMonth();

  return incidents.filter((incident) => {
    const createdAt = getCreatedAt(incident);
    if (!createdAt) {
      return false;
    }
    const created = new Date(createdAt);
    return created.getUTCFullYear() === referenceYear && created.getUTCMonth() === referenceMonth;
  }).length;
}
