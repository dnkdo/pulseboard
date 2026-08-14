import { Router } from 'express';
import { validateIncident } from '../../src/lib/validateIncident.js';
import { createIncident, getAllIncidents } from '../store/incidentStore.js';
import { toCSV, toJSON } from '../utils/exportIncidents.js';

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

const router = Router();

const EXPORT_CONTENT_TYPES = {
  csv: 'text/csv',
  json: 'application/json',
};

// Registered ahead of any future '/:id' route so 'export' is never captured
// as an incident id. Unrecognized or omitted formats default to JSON.
router.get('/export', (req, res) => {
  const { format } = req.query;
  const requestedFormat = format === undefined ? 'json' : String(format).toLowerCase();
  const normalizedFormat = Object.prototype.hasOwnProperty.call(EXPORT_CONTENT_TYPES, requestedFormat)
    ? requestedFormat
    : 'json';

  const incidents = getAllIncidents();
  const body = normalizedFormat === 'csv' ? toCSV(incidents) : toJSON(incidents);

  res.set('Content-Type', EXPORT_CONTENT_TYPES[normalizedFormat]);
  res.set('Content-Disposition', `attachment; filename="incidents.${normalizedFormat}"`);
  res.status(200).send(body);
});

router.get('/', (req, res) => {
  res.json(getAllIncidents());
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

  const incident = createIncident({ title, severity, affected_components: affectedComponents, summary });
  return res.status(201).json(incident);
});

export default router;
