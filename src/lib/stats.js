// Pure stat-card derivation — takes an incident list and a precomputed uptime
// percentage (from the uptime service pipeline) and returns the four
// dashboard stat-card values. No DB access here; callers own fetching
// incidents and computing uptimePercentage so this stays cheap to test and
// safe to recompute on every request.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Incident shape isn't fully pinned down yet across callers (raw SQLite rows
// use `state`/`created_at`/`updated_at`; other predicted fixtures use
// `status`/`resolved_at`), so accept either.
function isResolved(incident) {
  return (incident.state ?? incident.status) === 'resolved';
}

function getCreatedAt(incident) {
  return incident.created_at ?? incident.createdAt ?? null;
}

// resolved is a terminal state (no further transitions), so updated_at at
// the time an incident is resolved is equivalent to its resolution time.
function getResolvedAt(incident) {
  if (!isResolved(incident)) {
    return null;
  }
  return incident.resolved_at ?? incident.resolvedAt ?? incident.updated_at ?? incident.updatedAt ?? null;
}

export function computeStatCards(incidents = [], uptimePercentage = 0, now = new Date()) {
  const nowMs = now.getTime();
  const openIncidents = incidents.filter((incident) => !isResolved(incident)).length;

  const windowStartMs = nowMs - SEVEN_DAYS_MS;
  const mttrDurationsMinutes = incidents
    .filter(isResolved)
    .map((incident) => {
      const createdAt = getCreatedAt(incident);
      const resolvedAt = getResolvedAt(incident);
      if (!createdAt || !resolvedAt) {
        return null;
      }
      const resolvedMs = new Date(resolvedAt).getTime();
      if (resolvedMs < windowStartMs || resolvedMs > nowMs) {
        return null;
      }
      return (resolvedMs - new Date(createdAt).getTime()) / 60000;
    })
    .filter((duration) => duration !== null);

  const mttr7d =
    mttrDurationsMinutes.length > 0
      ? mttrDurationsMinutes.reduce((sum, duration) => sum + duration, 0) / mttrDurationsMinutes.length
      : 0;

  const monthStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
  const incidentsThisMonth = incidents.filter((incident) => {
    const createdAt = getCreatedAt(incident);
    if (!createdAt) {
      return false;
    }
    const createdMs = new Date(createdAt).getTime();
    return createdMs >= monthStartMs && createdMs <= nowMs;
  }).length;

  return {
    openIncidents,
    mttr7d,
    incidentsThisMonth,
    uptimePercentage,
  };
}

export default computeStatCards;
