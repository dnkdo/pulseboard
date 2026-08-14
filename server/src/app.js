import express from 'express';
import db from '../../src/index.js';
import { createStatsRouter } from './routes/stats.js';
import { createIncidentsRouter } from './routes/incidents.js';
import componentsRouter from '../routes/components.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/stats', createStatsRouter(db));
app.use('/api/incidents', createIncidentsRouter(db));
app.use('/api/components', componentsRouter);

export default app;
