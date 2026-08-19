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
// side effect.
loadSeedDataIfEmpty(db);

const app = express();

app.use(express.json());

app.use('/health', healthRouter);

app.use('/api/stats', createStatsRouter(db));
app.use('/api/incidents', createIncidentsRouter(db));
app.use('/api/components', componentsRouter);

export default app;
