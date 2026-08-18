// Integration coverage for PLB-91: proves the internal PATCH endpoint and
// the public status page read the same underlying data source, so
// resolving an incident is reflected on the very next read with no
// artificial delay.
//
// There is no separate "active card" / "past incidents" / "banner" HTTP
// endpoint in this codebase (see CLAUDE.md's API-surface note) — the public
// status page derives all three views client-side from a single
// GET /api/incidents response:
//   server GET /api/incidents (state-shaped rows)
//     -> client/src/lib/api/incidents.js#normalizeIncident (state -> status/resolvedAt)
//     -> src/lib/incidents.js#filterActiveIncidents / #sortPastIncidentsDesc (used by
//        ActiveIncidentsList.jsx / PastIncidentsList.jsx via useIncidentPolling)
//     -> src/lib/status.js#computeOverallStatus (used by StatusBanner.jsx)
// This suite drives the real HTTP layer (supertest against the real Express
// app) for the write (PATCH) and read (GET) legs, then runs the exact same
// production derivation functions the public components use on the read
// response — rather than re-implementing that logic in the test — so a
// regression in any layer of the real pipeline fails these assertions.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app, { resetIncidents } from '../helpers/testServer.js';
import { buildActiveIncidentPayload, buildLowerSeverityIncidentPayload } from '../fixtures/incidents.js';
import { normalizeIncident } from '../../client/src/lib/api/incidents.js';
import { filterActiveIncidents, sortPastIncidentsDesc } from '../../src/lib/incidents.js';
import { computeOverallStatus } from '../../src/lib/status.js';

async function declareIncident(payload) {
  const res = await request(app).post('/api/incidents').send(payload);
  expect(res.status).toBe(201);
  return res.body;
}

async function transitionTo(id, state) {
  const res = await request(app).patch(`/api/incidents/${id}`).send({ state });
  expect(res.status).toBe(200);
  return res.body;
}

// The state machine is strictly sequential (open -> investigating ->
// identified -> resolved; src/lib/incidentState.js#isValidTransition only
// allows moving exactly one step at a time), so reaching 'resolved' from
// the 'open' state POST creates requires walking every intermediate state.
async function resolveIncident(id) {
  await transitionTo(id, 'investigating');
  await transitionTo(id, 'identified');
  return transitionTo(id, 'resolved');
}

// Single GET /api/incidents call, fed through the real client-side
// derivation pipeline — this is deliberately one read reused for all three
// views, matching "the very next read" rather than three separate fetches
// that could observe different underlying state.
async function readPublicSurfaces() {
  const res = await request(app).get('/api/incidents');
  expect(res.status).toBe(200);
  const normalized = res.body.map(normalizeIncident);
  return {
    active: filterActiveIncidents(normalized),
    past: sortPastIncidentsDesc(normalized),
    banner: computeOverallStatus(normalized),
  };
}

describe('resolve-incident state sync to public dashboard surfaces (PLB-91)', () => {
  beforeEach(() => {
    resetIncidents();
  });

  describe('before resolution', () => {
    it('shows a freshly declared incident as active with the banner reflecting its severity', async () => {
      const incident = await declareIncident(buildActiveIncidentPayload());

      const { active, past, banner } = await readPublicSurfaces();

      expect(active.map((i) => i.id)).toEqual([incident.id]);
      expect(past).toEqual([]);
      expect(banner.status).toBe(incident.severity);
      expect(banner.severity).toBe(incident.severity);
    });
  });

  describe('resolving the only active incident', () => {
    it('AC1: empties the public active-incident card on the very next read', async () => {
      const incident = await declareIncident(buildActiveIncidentPayload());
      await resolveIncident(incident.id);

      const { active } = await readPublicSurfaces();

      expect(active).toEqual([]);
      expect(active.find((i) => i.id === incident.id)).toBeUndefined();
    });

    it('AC2: the resolved incident appears in the public past-incidents list with a valid resolvedAt on the very next read', async () => {
      const incident = await declareIncident(buildActiveIncidentPayload());
      await resolveIncident(incident.id);

      const { past } = await readPublicSurfaces();

      expect(past).toHaveLength(1);
      expect(past[0].id).toBe(incident.id);
      expect(past[0].status).toBe('resolved');
      expect(past[0].resolvedAt).toBeTruthy();
      expect(Number.isNaN(Date.parse(past[0].resolvedAt))).toBe(false);
    });

    it('AC3: the banner falls back to operational on the very next read', async () => {
      const incident = await declareIncident(buildActiveIncidentPayload());
      await resolveIncident(incident.id);

      const { banner } = await readPublicSurfaces();

      expect(banner.status).toBe('operational');
      expect(banner.severity).toBeNull();
    });
  });

  describe('resolving one of several active incidents', () => {
    it("AC3 (next-highest-severity branch): banner falls back to the remaining incident's severity, not operational, while the other incident stays active and out of past incidents", async () => {
      const higher = await declareIncident(buildActiveIncidentPayload()); // SEV1
      const lower = await declareIncident(buildLowerSeverityIncidentPayload()); // SEV3

      await resolveIncident(higher.id);

      const { active, past, banner } = await readPublicSurfaces();

      expect(active.map((i) => i.id)).toEqual([lower.id]);
      expect(past.map((i) => i.id)).toEqual([higher.id]);
      expect(banner.status).not.toBe('operational');
      expect(banner.status).toBe(lower.severity);
      expect(banner.severity).toBe(lower.severity);
    });
  });

  describe('error path', () => {
    it('PATCH on an unknown incident id returns 404 and leaves the active incident/banner unchanged', async () => {
      const incident = await declareIncident(buildActiveIncidentPayload());

      const res = await request(app).patch('/api/incidents/does-not-exist').send({ state: 'investigating' });
      expect(res.status).toBe(404);

      const { active, banner } = await readPublicSurfaces();
      expect(active.map((i) => i.id)).toEqual([incident.id]);
      expect(active[0].status).not.toBe('resolved');
      expect(banner.status).toBe(incident.severity);
    });

    it('rejects a non-sequential PATCH (open -> resolved, skipping intermediate states) with 400 and leaves the incident active', async () => {
      const incident = await declareIncident(buildActiveIncidentPayload());

      const res = await request(app).patch(`/api/incidents/${incident.id}`).send({ state: 'resolved' });
      expect(res.status).toBe(400);

      const { active, past } = await readPublicSurfaces();
      expect(active.map((i) => i.id)).toEqual([incident.id]);
      expect(past).toEqual([]);
    });
  });
});
