import express from 'express';
import db from '../../src/index.js';
import { createStatsRouter } from './routes/stats.js';
import { createIncidentsRouter } from './routes/incidents.js';
import componentsRouter from '../../src/routes/componentsRoutes.js';
import healthRouter from '../routes/health.js';

const app = express();

app.use(express.json());

app.use('/health', healthRouter);

app.use('/api/stats', createStatsRouter(db));
app.use('/api/incidents', createIncidentsRouter(db));
app.use('/api/components', componentsRouter);

export default app;
