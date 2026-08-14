import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { loadComponents } from '../models/component.js';

describe('GET /api/components', () => {
  it('responds 200 with every seeded component, none dropped', async () => {
    const res = await request(app).get('/api/components');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(loadComponents().length);
  });

  it('includes id, name, healthState, and a numeric uptimePercent on every item', async () => {
    const res = await request(app).get('/api/components');

    for (const component of res.body) {
      expect(typeof component.id).toBe('string');
      expect(typeof component.name).toBe('string');
      expect(typeof component.healthState).toBe('string');
      expect(typeof component.uptimePercent).toBe('number');
    }
  });

  it('includes a component at the 100% uptime boundary rather than filtering it out', async () => {
    const res = await request(app).get('/api/components');

    expect(res.body).toContainEqual(expect.objectContaining({ uptimePercent: 100 }));
  });
});
