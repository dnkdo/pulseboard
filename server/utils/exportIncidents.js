// Pure serialization utilities for incident history export — no Express/IO
// dependencies, so they're unit-testable in isolation and reusable outside
// the route (e.g. CLI export tooling).

// Used only when incidents is empty, so the CSV header row is still emitted
// with a stable, predictable field order.
const DEFAULT_FIELDS = ['id', 'title', 'severity', 'status', 'createdAt', 'resolvedAt'];

function escapeCsvField(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Header/field order is derived from the keys of the first incident so it
// always matches the shape of the data actually being exported; falls back
// to DEFAULT_FIELDS only when there is no incident to derive keys from.
export function toCSV(incidents) {
  const fields = incidents.length > 0 ? Object.keys(incidents[0]) : DEFAULT_FIELDS;
  const header = fields.join(',');
  const rows = incidents.map((incident) => fields.map((field) => escapeCsvField(incident[field])).join(','));
  return [header, ...rows].join('\n');
}

// Intentionally a thin wrapper so JSON.parse(toJSON(x)) deep-equals x.
export function toJSON(incidents) {
  return JSON.stringify(incidents);
}
