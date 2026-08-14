// Single incidents router for /api/incidents — consolidated onto the shared
// SQLite db (src/models/db.js) so create (POST), list/filter (GET), export
// (GET /export), and the sequential state-machine transition (PATCH /:id)
// all read and write the same incident rows. Previously GET/POST/export
// lived on a separate in-memory store mounted at the same path as this
// PATCH-only router; that split meant incidents created via POST were
// invisible to PATCH and to computeStatCards. See CLAUDE.md's incident
// state machine section — PATCH must always go through isValidTransition.
import { Router } from 'express';
import { validateIncident } from '../../../src/lib/validateIncident.js';
import { isValidTransition } from '../../../src/lib/incidentState.js';
import { createIncident, getAllIncidents } from '../../store/incidentStore.js';
import { filterIncidents } from '../../utils/filterIncidents.js';
import { toCSV, toJSON } from '../../utils/exportIncidents.js';

const FIELD_MESSAGES = {
  title: 'title is required',
  severity: 'severity is required and must be one of SEV1, SEV2, SEV3',
  components: 'affected_components is required and must include at least one component',
  summary: 'summary is required',
};

// validateIncident (src/lib/validateIncident.js) speaks in terms of a
// "components" field so it stays reusable across endpoints; the public
// request/response shape for this route uses "affected_components".
const RESPONSE_FIELD_NAMES = { components: 'affected_components' };

function buildValidationErrors(invalidFields) {
  return invalidFields.reduce((errors, field) => {
    errors[RESPONSE_FIELD_NAMES[field] || field] = FIELD_MESSAGES[field];
    return errors;
  }, {});
}

// Query params arrive as strings; 'SEV1,SEV2' becomes ['SEV1', 'SEV2'] so
// filterIncidents can treat severity uniformly as a set membership check.
function parseSeverityParam(raw) {
  if (raw === undefined) {
    return undefined;
  }

  const values = Array.isArray(raw) ? raw : String(raw).split(',');
  return values.map((value) => value.trim()).filter(Boolean);
}

const EXPORT_CONTENT_TYPES = {
  csv: 'text/csv',
  json: 'application/json',
};

export function createIncidentsRouter(db) {
  const router = Router();

  // Registered ahead of any future '/:id' route so 'export' is never
  // captured as an incident id. Unrecognized or omitted formats default to JSON.
  router.get('/export', (req, res) => {
    const { format } = req.query;
    const requestedFormat = format === undefined ? 'json' : String(format).toLowerCase();
    const normalizedFormat = Object.prototype.hasOwnProperty.call(EXPORT_CONTENT_TYPES, requestedFormat)
      ? requestedFormat
      : 'json';

    const incidents = getAllIncidents(db);
    const body = normalizedFormat === 'csv' ? toCSV(incidents) : toJSON(incidents);

    res.set('Content-Type', EXPORT_CONTENT_TYPES[normalizedFormat]);
    res.set('Content-Disposition', `attachment; filename="incidents.${normalizedFormat}"`);
    res.status(200).send(body);
  });

  router.get('/', (req, res) => {
    const { severity, startDate, endDate } = req.query;

    const filtered = filterIncidents(getAllIncidents(db), {
      severity: parseSeverityParam(severity),
      startDate,
      endDate,
    });

    res.status(200).json(filtered);
  });

  router.post('/', (req, res) => {
    const { title, severity, affected_components: affectedComponents, summary } = req.body ?? {};

    const invalidFields = validateIncident({
      title,
      severity,
      components: affectedComponents,
      summary,
    });

    if (invalidFields.length > 0) {
      return res.status(400).json({ errors: buildValidationErrors(invalidFields) });
    }

    const incident = createIncident(db, { title, severity, affected_components: affectedComponents, summary });
    return res.status(201).json(incident);
  });

  router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const { state: nextState } = req.body ?? {};

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!incident) {
      return res.status(404).json({ error: `Incident '${id}' not found` });
    }

    if (!isValidTransition(incident.state, nextState)) {
      return res
        .status(400)
        .json({ error: `Cannot transition incident from '${incident.state}' to '${nextState}'` });
    }

    const now = new Date().toISOString();

    db.prepare('UPDATE incidents SET state = ?, updated_at = ? WHERE id = ?').run(nextState, now, id);
    db.prepare(
      `INSERT INTO incident_state_transitions (incident_id, from_state, to_state, transitioned_at)
       VALUES (?, ?, ?, ?)`
    ).run(id, incident.state, nextState, now);

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    res.status(200).json(updated);
  });

  return router;
}

export default createIncidentsRouter;
