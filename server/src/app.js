import express from 'express';
import db from '../../src/index.js';
import { loadSeedDataIfEmpty } from '../db/seedLoader.js';
import { createStatsRouter } from './routes/stats.js';
import { createIncidentsRouter } from './routes/incidents.js';
import componentsRouter from '../../src/routes/componentsRoutes.js';
import healthRouter from '../routes/health.js';

// db is already seeded on import (src/index.js runs seedIfFresh at module
// load); this call is idempotent and makes the server package's own
// fresh-install wiring explicit rather than relying solely on that import
// side effect. Guarded because src/index.js exports a null db when startup
// initialization failed — seeding is then meaningless, not an error.
if (db) {
  loadSeedDataIfEmpty(db);
}

const app = express();

app.use(express.json());

// Mounted at both paths: '/health' is the pre-existing internal build-health
// check (server/tests/*.test.js assert against it directly), '/api/health'
// is what the public post-deploy smoke check and the '/api/*' routing rule
// in vercel.json actually probe. Registered before the DB-backed routers and
// with no dependency on `db` so it reports liveness even when DB init failed.
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

app.use('/api/stats', createStatsRouter(db));
app.use('/api/incidents', createIncidentsRouter(db));
app.use('/api/components', componentsRouter);

export default app;
