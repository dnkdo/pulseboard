// GET /api/stats — recomputes fresh from the DB on every request (no
// caching/memoization) so stat cards reflect the latest incident state as
// soon as the client refetches, e.g. right after a PATCH.
import { Router } from 'express';
import { computeStatCards } from '../../../src/lib/stats.js';
import { calculateUptime } from '../../../src/services/uptime.js';
import { computeMTTR, computeOpenCount, computeIncidentsThisMonth } from '../../../src/services/stats.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPTIME_WINDOW_MS = 30 * DAY_MS;

// Downtime = time each incident spent open, clipped to the trailing 30-day
// observation window. This does not merge overlapping incident intervals
// (simplifying assumption — the business definition of "downtime" across
// concurrent incidents is not yet specified; see PLB-79 plan warnings).
export function computeWindowUptimePercentage(incidents, now = new Date()) {
  const windowEndMs = now.getTime();
  const windowStartMs = windowEndMs - UPTIME_WINDOW_MS;

  const downtimeMs = incidents.reduce((total, incident) => {
    const createdMs = new Date(incident.created_at).getTime();
    const resolvedMs = incident.state === 'resolved' ? new Date(incident.updated_at).getTime() : windowEndMs;

    const clippedStart = Math.max(createdMs, windowStartMs);
    const clippedEnd = Math.min(resolvedMs, windowEndMs);
    const duration = clippedEnd - clippedStart;
    return total + (duration > 0 ? duration : 0);
  }, 0);

  return calculateUptime(downtimeMs, windowEndMs - windowStartMs);
}

// Overall (all-time) uptime — same clipped-downtime pipeline as
// computeWindowUptimePercentage, but the observation period spans from the
// earliest incident's created_at through `now` instead of a fixed trailing
// window. No incidents at all means no observed downtime.
export function computeOverallUptimePercentage(incidents, now = new Date()) {
  if (incidents.length === 0) {
    return 100;
  }

  const nowMs = now.getTime();
  const periodStartMs = Math.min(...incidents.map((incident) => new Date(incident.created_at).getTime()));

  const downtimeMs = incidents.reduce((total, incident) => {
    const createdMs = new Date(incident.created_at).getTime();
    const resolvedMs = incident.state === 'resolved' ? new Date(incident.updated_at).getTime() : nowMs;

    const clippedStart = Math.max(createdMs, periodStartMs);
    const clippedEnd = Math.min(resolvedMs, nowMs);
    const duration = clippedEnd - clippedStart;
    return total + (duration > 0 ? duration : 0);
  }, 0);

  return calculateUptime(downtimeMs, nowMs - periodStartMs);
}

export function createStatsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const incidents = db.prepare('SELECT * FROM incidents').all();
    const now = new Date();
    const uptimePercentage = computeWindowUptimePercentage(incidents, now);
    const stats = computeStatCards(incidents, uptimePercentage, now);

    res.status(200).json({
      // Legacy PLB-79 dashboard stat-card fields (openIncidents, mttr7d — a
      // trailing-7-day windowed MTTR, incidentsThisMonth, uptimePercentage — a
      // trailing-30-day windowed uptime). Kept as-is because
      // client/src/dashboard/index.js already consumes these field names;
      // they are NOT the fields that satisfy the PLB-71 acceptance criteria.
      ...stats,
      // PLB-71 acceptance-criteria fields: exact, non-windowed aggregates
      // computed by the pure functions in src/services/stats.js.
      mttrMinutes: computeMTTR(incidents),
      openCount: computeOpenCount(incidents),
      incidentsThisMonth: computeIncidentsThisMonth(incidents, now),
      uptime: computeOverallUptimePercentage(incidents, now),
    });
  });

  return router;
}

export default createStatsRouter;
