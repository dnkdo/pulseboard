import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('server/src/app.js wiring', () => {
  it('loads without a circular-dependency/require error and serves GET /api/stats', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openIncidents: expect.any(Number),
      mttr7d: expect.any(Number),
      incidentsThisMonth: expect.any(Number),
      uptimePercentage: expect.any(Number),
    });
  });

  it('serves PATCH /api/incidents/:id and returns 404 for an unknown incident', async () => {
    const res = await request(app).patch('/api/incidents/does-not-exist').send({ state: 'investigating' });

    expect(res.status).toBe(404);
  });
});
