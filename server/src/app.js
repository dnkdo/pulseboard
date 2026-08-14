import express from 'express';
import incidentsRouter from '../routes/incidents.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/incidents', incidentsRouter);

export default app;
