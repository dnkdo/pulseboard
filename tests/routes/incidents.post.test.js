import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import { resetIncidentStore } from '../../server/store/incidentStore.js';

const VALID_PAYLOAD = {
  title: 'API latency spike',
  severity: 'SEV2',
  affected_components: ['api'],
  summary: 'Elevated p99 latency on the core API',
};

beforeEach(() => {
  resetIncidentStore();
});

describe('POST /api/incidents — validation (AC1)', () => {
  it.each([
    ['title', { ...VALID_PAYLOAD, title: '' }, 'title'],
    ['severity', { ...VALID_PAYLOAD, severity: '' }, 'severity'],
    ['affected_components', { ...VALID_PAYLOAD, affected_components: [] }, 'affected_components'],
    ['summary', { ...VALID_PAYLOAD, summary: '' }, 'summary'],
  ])(
    'returns 400 with a field-level message when %s is empty',
    async (_label, payload, expectedKey) => {
      const res = await request(app).post('/api/incidents').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty(expectedKey);
      expect(typeof res.body.errors[expectedKey]).toBe('string');
      expect(res.body.errors[expectedKey].length).toBeGreaterThan(0);
    },
  );

  it.each([
    ['title', { ...VALID_PAYLOAD, title: undefined }, 'title'],
    ['severity', { ...VALID_PAYLOAD, severity: undefined }, 'severity'],
    [
      'affected_components',
      { ...VALID_PAYLOAD, affected_components: undefined },
      'affected_components',
    ],
    ['summary', { ...VALID_PAYLOAD, summary: undefined }, 'summary'],
  ])(
    'returns 400 with a field-level message when %s is missing',
    async (_label, payload, expectedKey) => {
      const res = await request(app).post('/api/incidents').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty(expectedKey);
    },
  );

  it('returns 400 with all four field errors when the body is empty, and does not create an incident', async () => {
    const res = await request(app).post('/api/incidents').send({});

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(
      ['affected_components', 'severity', 'summary', 'title'].sort(),
    );

    const listRes = await request(app).get('/api/incidents');
    expect(listRes.body).toEqual([]);
  });

  it('does not persist an incident when validation fails', async () => {
    await request(app)
      .post('/api/incidents')
      .send({ ...VALID_PAYLOAD, title: '' });
    const listRes = await request(app).get('/api/incidents');
    expect(listRes.body).toHaveLength(0);
  });
});

describe('POST /api/incidents — creation (AC2)', () => {
  it('returns 201 with the created incident set to state "open" when all fields are valid', async () => {
    const res = await request(app).post('/api/incidents').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: VALID_PAYLOAD.title,
      severity: VALID_PAYLOAD.severity,
      affected_components: VALID_PAYLOAD.affected_components,
      summary: VALID_PAYLOAD.summary,
      state: 'open',
    });
    expect(res.body.id).toBeTruthy();
    expect(typeof res.body.id).toBe('string');
  });

  it('accepts a non-empty string for affected_components, not only arrays', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...VALID_PAYLOAD, affected_components: 'api' });

    expect(res.status).toBe(201);
    expect(res.body.affected_components).toBe('api');
  });
});

describe('POST /api/incidents — immediate GET visibility (AC3)', () => {
  it('makes a newly created incident retrievable via GET /api/incidents in the same request cycle', async () => {
    const postRes = await request(app).post('/api/incidents').send(VALID_PAYLOAD);
    expect(postRes.status).toBe(201);
    const createdId = postRes.body.id;

    const getRes = await request(app).get('/api/incidents');

    expect(getRes.status).toBe(200);
    const found = getRes.body.find((incident) => incident.id === createdId);
    expect(found).toBeDefined();
    expect(found.title).toBe(VALID_PAYLOAD.title);
    expect(found.state).toBe('open');
  });

  it('accumulates multiple created incidents and lists all of them immediately', async () => {
    await request(app).post('/api/incidents').send(VALID_PAYLOAD);
    await request(app)
      .post('/api/incidents')
      .send({ ...VALID_PAYLOAD, title: 'DB connection pool exhausted', severity: 'SEV1' });

    const getRes = await request(app).get('/api/incidents');
    expect(getRes.body).toHaveLength(2);
    expect(getRes.body.map((incident) => incident.title)).toEqual(
      expect.arrayContaining(['API latency spike', 'DB connection pool exhausted']),
    );
  });
});
