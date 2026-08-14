import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /health (build health smoke test)', () => {
  it('responds 200 with a status field present in the JSON body', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBeTruthy();
  });

  it('responds with a JSON content type', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
