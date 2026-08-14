import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../server/src/app.js';
import db from '../src/index.js';
import { createIncident, resetIncidentStore } from '../server/store/incidentStore.js';

function seedIncident({ severity, createdAt }) {
  return createIncident(
    db,
    {
      title: `${severity} incident`,
      severity,
      affected_components: ['api'],
      summary: 'seeded for filter tests',
    },
    { now: () => createdAt }
  );
}

describe('GET /api/incidents', () => {
  let seeded;

  beforeEach(() => {
    resetIncidentStore(db);
    seeded = [
      seedIncident({ severity: 'SEV1', createdAt: '2026-08-01T00:00:00.000Z' }),
      seedIncident({ severity: 'SEV2', createdAt: '2026-08-05T00:00:00.000Z' }),
      seedIncident({ severity: 'SEV3', createdAt: '2026-08-10T00:00:00.000Z' }),
      seedIncident({ severity: 'SEV1', createdAt: '2026-08-15T00:00:00.000Z' }),
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetIncidentStore(db);
  });

  it('returns only incidents matching severity passed as repeated query params', async () => {
    const res = await request(app).get('/api/incidents?severity=SEV1&severity=SEV3');

    expect(res.status).toBe(200);
    expect(res.body.every((incident) => ['SEV1', 'SEV3'].includes(incident.severity))).toBe(true);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(
      [seeded[0].id, seeded[2].id, seeded[3].id].sort()
    );
  });

  it('returns 200 with a JSON array of all incidents when unfiltered', async () => {
    const res = await request(app).get('/api/incidents');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(seeded.length);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(
      seeded.map((incident) => incident.id).sort()
    );
  });

  it('returns only incidents matching a single severity', async () => {
    const res = await request(app).get('/api/incidents').query({ severity: 'SEV1' });

    expect(res.status).toBe(200);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(
      [seeded[0].id, seeded[3].id].sort()
    );
    expect(res.body.every((incident) => incident.severity === 'SEV1')).toBe(true);
  });

  it('returns only incidents matching a comma-separated severity set', async () => {
    const res = await request(app).get('/api/incidents').query({ severity: 'SEV1,SEV3' });

    expect(res.status).toBe(200);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(
      [seeded[0].id, seeded[2].id, seeded[3].id].sort()
    );
  });

  it('returns only incidents within an inclusive startDate/endDate range', async () => {
    const res = await request(app)
      .get('/api/incidents')
      .query({ startDate: '2026-08-05T00:00:00.000Z', endDate: '2026-08-10T23:59:59.000Z' });

    expect(res.status).toBe(200);
    expect(res.body.map((incident) => incident.id).sort()).toEqual(
      [seeded[1].id, seeded[2].id].sort()
    );
  });

  it('applies severity and date range filters together with AND semantics', async () => {
    const res = await request(app).get('/api/incidents').query({
      severity: 'SEV1',
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-06T00:00:00.000Z',
    });

    expect(res.status).toBe(200);
    expect(res.body.map((incident) => incident.id)).toEqual([seeded[0].id]);
  });

  it('returns an empty JSON array (not an error) when no incident matches', async () => {
    const res = await request(app).get('/api/incidents').query({ severity: 'SEV_NONEXISTENT' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('does not 500 on an unparseable date and falls back to unfiltered results', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(app).get('/api/incidents').query({ startDate: 'not-a-real-date' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(seeded.length);
    warnSpy.mockRestore();
  });
});
