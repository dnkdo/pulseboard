import express from 'express';
import { createStatsRouter } from './routes/stats.js';
import { createIncidentsRouter } from './routes/incidents.js';
import componentsRouter from '../../src/routes/componentsRoutes.js';
import healthRouter from '../routes/health.js';

const app = express();

app.use(express.json());

// Mounted at both paths — '/health' is the pre-existing internal build-health
// check (server/tests/*.test.js assert against it directly), '/api/health'
// is what the public post-deploy smoke check and the '/api/*' routing rule
// in vercel.json actually probe — and registered *before* the dynamic import
// below, with no dependency on it, so liveness survives a database failure
// of any kind.
//
// PLB-110/PLB-163: this used to be a static `import db from '../../src/index.js'`
// at the top of the file. src/index.js wraps its own initDatabase() call in
// try/catch, but that only guards the function *call* — the static import
// chain (src/index.js -> src/models/db.js -> the better-sqlite3 native
// binding) is evaluated before any of that try/catch ever runs. When the
// native binding fails to load for the deployed runtime (the actual PLB-78
// prod smoke failure), that throw happened during module evaluation, which
// crashed this whole serverless function — every route on it, including
// GET /api/health — before Express even finished being configured. A dynamic
// import() rejects into a normal try/catch instead, so a database failure
// degrades only the DB-backed routes below rather than the process.
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

let db = null;
try {
  ({ default: db } = await import('../../src/index.js'));
  const { loadSeedDataIfEmpty } = await import('../db/seedLoader.js');
  // db is already seeded on import (src/index.js runs seedIfFresh at module
  // load); this call is idempotent and makes the server package's own
  // fresh-install wiring explicit rather than relying solely on that import
  // side effect. Guarded because a null db means startup initialization
  // failed — seeding is then meaningless, not an error.
  if (db) {
    loadSeedDataIfEmpty(db);
  }
} catch (error) {
  console.error('Database module failed to load at startup:', error);
}

app.use('/api/stats', createStatsRouter(db));
app.use('/api/incidents', createIncidentsRouter(db));
app.use('/api/components', componentsRouter);

export default app;
