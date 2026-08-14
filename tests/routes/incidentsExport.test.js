import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import {
  createIncident,
  getAllIncidents,
  resetIncidentStore,
} from '../../server/store/incidentStore.js';
import { toCSV } from '../../server/utils/exportIncidents.js';

const SEED_PAYLOADS = [
  {
    title: 'API latency spike',
    severity: 'SEV2',
    affected_components: ['api'],
    summary: 'Elevated p99 latency',
  },
  {
    title: 'DB connection pool exhausted',
    severity: 'SEV1',
    affected_components: ['db'],
    summary: 'Primary DB unreachable',
  },
];

beforeEach(() => {
  resetIncidentStore();
});

describe('GET /api/incidents/export', () => {
  it('format=csv returns 200, text/csv, an attachment header, and one CSV row per incident plus a header row', async () => {
    SEED_PAYLOADS.forEach((payload) =>
      createIncident(payload, { now: () => '2026-08-13T00:00:00.000Z' }),
    );

    const res = await request(app).get('/api/incidents/export?format=csv');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/^attachment/);
    expect(res.headers['content-disposition']).toContain('filename=');

    const lines = res.text.split('\n');
    expect(lines).toHaveLength(SEED_PAYLOADS.length + 1);
    expect(lines[0]).toBe(toCSV([getAllIncidents()[0]]).split('\n')[0]);
  });

  it('format=json returns 200, application/json, an attachment header, and a body that parses back to the full incident array', async () => {
    SEED_PAYLOADS.forEach((payload) => createIncident(payload));

    const res = await request(app).get('/api/incidents/export?format=json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['content-disposition']).toMatch(/^attachment/);
    expect(res.headers['content-disposition']).toContain('filename=');

    const parsed = JSON.parse(res.text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(SEED_PAYLOADS.length);
    expect(parsed.map((incident) => incident.title).sort()).toEqual(
      SEED_PAYLOADS.map((p) => p.title).sort(),
    );
  });

  it('defaults to JSON when format is omitted', async () => {
    createIncident(SEED_PAYLOADS[0]);

    const res = await request(app).get('/api/incidents/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
  });

  it('defaults to JSON when format is unrecognized', async () => {
    createIncident(SEED_PAYLOADS[0]);

    const res = await request(app).get('/api/incidents/export?format=xml');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(() => JSON.parse(res.text)).not.toThrow();
  });

  it('is not shadowed by a route that would treat "export" as an incident id', async () => {
    createIncident(SEED_PAYLOADS[0]);

    const res = await request(app).get('/api/incidents/export?format=csv');

    expect(res.status).toBe(200);
    expect(res.text.startsWith('id,')).toBe(true);
  });

  it('still returns a header row when there are no incidents', async () => {
    const res = await request(app).get('/api/incidents/export?format=csv');

    expect(res.status).toBe(200);
    expect(res.text.split('\n')).toHaveLength(1);
    expect(res.text.length).toBeGreaterThan(0);
  });
});
