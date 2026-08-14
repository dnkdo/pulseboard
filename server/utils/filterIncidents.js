// Pure filtering utility — no Express/IO dependencies, safe to unit test and
// reuse from other call sites (export, status-page work) in this epic.

function normalizeSeverity(severity) {
  if (severity === undefined || severity === null) {
    return null;
  }

  const values = Array.isArray(severity) ? severity : [severity];
  const set = new Set(values.filter((value) => value !== undefined && value !== null && value !== ''));
  return set.size > 0 ? set : null;
}

function parseDateBound(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) {
    console.warn(`filterIncidents: ignoring unparseable ${label} "${value}"`);
    return null;
  }

  return ms;
}

// filters: { severity?: string | string[], startDate?: string, endDate?: string }
// All provided criteria compose with AND semantics; omitted criteria are no-ops.
export function filterIncidents(incidents, filters = {}) {
  const { severity, startDate, endDate } = filters;
  const severitySet = normalizeSeverity(severity);
  const startMs = parseDateBound(startDate, 'startDate');
  const endMs = parseDateBound(endDate, 'endDate');

  return incidents.filter((incident) => {
    if (severitySet && !severitySet.has(incident.severity)) {
      return false;
    }

    if (startMs !== null || endMs !== null) {
      const createdMs = new Date(incident.createdAt).getTime();
      if (Number.isNaN(createdMs)) {
        return false;
      }
      if (startMs !== null && createdMs < startMs) {
        return false;
      }
      if (endMs !== null && createdMs > endMs) {
        return false;
      }
    }

    return true;
  });
}

export default filterIncidents;
