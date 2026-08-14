// GET /api/stats — recomputes fresh from the DB on every request (no
// caching/memoization) so stat cards reflect the latest incident state as
// soon as the client refetches, e.g. right after a PATCH.
import { Router } from 'express';
import { computeStatCards } from '../../../src/lib/stats.js';
import { calculateUptime } from '../../../src/services/uptime.js';

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

export function createStatsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const incidents = db.prepare('SELECT * FROM incidents').all();
    const now = new Date();
    const uptimePercentage = computeWindowUptimePercentage(incidents, now);
    const stats = computeStatCards(incidents, uptimePercentage, now);
    res.status(200).json(stats);
  });

  return router;
}

export default createStatsRouter;
