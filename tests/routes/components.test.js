import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import { loadComponents } from '../../server/models/component.js';

describe('GET /api/components (AC1, AC3)', () => {
  it('returns 200 with the full list of seeded components on a fresh install', async () => {
    const res = await request(app).get('/api/components');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(loadComponents().length);
  });

  it('includes healthState and a numeric uptimePercent on every component payload', async () => {
    const res = await request(app).get('/api/components');

    for (const component of res.body) {
      expect(typeof component.id).toBe('string');
      expect(typeof component.name).toBe('string');
      expect(typeof component.healthState).toBe('string');
      expect(typeof component.uptimePercent).toBe('number');
    }
  });
});

describe('GET /api/components/:id (AC2)', () => {
  it('returns 200 with the matching component including its healthState and uptimePercent', async () => {
    const [seeded] = loadComponents();

    const res = await request(app).get(`/api/components/${seeded.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: seeded.id,
      name: seeded.name,
      healthState: seeded.healthState,
      uptimePercent: Number(seeded.uptimePercent),
    });
    expect(typeof res.body.uptimePercent).toBe('number');
  });

  it('returns 404 with a JSON error body for an id that does not exist', async () => {
    const res = await request(app).get('/api/components/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('does not partial-match ids (a prefix of a real id is treated as unknown)', async () => {
    const [seeded] = loadComponents();
    const prefix = seeded.id.slice(0, 3);

    const res = await request(app).get(`/api/components/${prefix}`);

    expect(res.status).toBe(404);
  });
});
