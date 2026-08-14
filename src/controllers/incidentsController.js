// Incident response serializer plus the GET /api/incidents (list) and
// GET /api/incidents/:id (detail) handlers built on top of it. Defensive
// about field-naming drift from the underlying SQLite store (e.g.
// affected_components/description) so the public response shape stays
// stable even if the store's internal column names change.
import {
  getAllIncidents,
  getIncidentById as findIncidentById,
  getIncidentStateHistory,
} from '../../server/store/incidentStore.js';
import { filterIncidents } from '../../server/utils/filterIncidents.js';

export function serializeIncident(incident = {}) {
  return {
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    affectedComponents: incident.affectedComponents ?? incident.affected_components ?? [],
    summary: incident.summary ?? incident.description ?? '',
    state: incident.state ?? incident.status ?? null,
    stateHistory: incident.stateHistory ?? incident.state_history ?? [],
  };
}

function withStateHistory(db, incident) {
  return { ...incident, stateHistory: getIncidentStateHistory(db, incident) };
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

// Curried on `db` so route factories and tests can pass either the app's
// shared singleton or an isolated test db, matching the rest of the
// server/src/routes/incidents.js router.
export function listIncidents(db) {
  return (req, res) => {
    const { severity, startDate, endDate } = req.query;

    const filtered = filterIncidents(getAllIncidents(db), {
      severity: parseSeverityParam(severity),
      startDate,
      endDate,
    });

    res.status(200).json(filtered.map((incident) => serializeIncident(withStateHistory(db, incident))));
  };
}

export function getIncidentById(db) {
  return (req, res) => {
    const incident = findIncidentById(db, req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.status(200).json(serializeIncident(withStateHistory(db, incident)));
  };
}
