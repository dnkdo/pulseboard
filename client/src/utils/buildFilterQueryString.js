// Serializes the timeline filter bar's current selection into a query
// string consumed by GET /api/incidents (server/utils/filterIncidents.js,
// wired in src/controllers/incidentsController.js#listIncidents). Only
// provided, non-empty values are appended — omitted/blank fields are no-ops
// on the server's filter (undefined criteria there mean "don't filter"), so
// a query string built here must never emit a stray `key=` for them.
function isNonEmpty(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

// severity may arrive as a single string (SeverityDropdown's controlled
// value) or an array (multi-value callers, e.g. a saved filter preset) —
// the server's parseSeverityParam splits on commas either way, so an array
// is joined into the same comma-separated shape a single string would be.
function normalizeSeverity(severity) {
  if (Array.isArray(severity)) {
    return severity
      .filter((value) => isNonEmpty(value))
      .map((value) => String(value).trim())
      .join(',');
  }
  return severity;
}

export function buildFilterQueryString({ severity, startDate, endDate } = {}) {
  const params = new URLSearchParams();

  const normalizedSeverity = normalizeSeverity(severity);
  if (isNonEmpty(normalizedSeverity)) {
    params.set('severity', normalizedSeverity);
  }
  if (isNonEmpty(startDate)) {
    params.set('startDate', String(startDate).trim());
  }
  if (isNonEmpty(endDate)) {
    params.set('endDate', String(endDate).trim());
  }

  return params.toString();
}

export default buildFilterQueryString;
