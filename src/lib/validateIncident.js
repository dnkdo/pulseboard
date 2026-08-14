// Pure, framework-agnostic incident payload validator — no Express types,
// safe to unit test standalone and reuse across any endpoint that accepts
// incident-shaped input.
import { SEVERITIES } from '../models/schema.js';

const REQUIRED_FIELDS = ['title', 'severity', 'components', 'summary'];

function isNonBlankString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidComponents(value) {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(isNonBlankString);
  }
  return isNonBlankString(value);
}

function isFieldValid(field, value) {
  if (field === 'components') return isValidComponents(value);
  if (field === 'severity') return isNonBlankString(value) && SEVERITIES.includes(value);
  return isNonBlankString(value);
}

// Returns the list of required-field names that fail validation (missing,
// empty, whitespace-only, or — for components — an empty array). An empty
// array return value means the payload is fully valid.
export function validateIncident(payload = {}) {
  return REQUIRED_FIELDS.filter((field) => !isFieldValid(field, payload[field]));
}

export default validateIncident;
