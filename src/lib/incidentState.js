// Sequential incident-transition validator — the single source of truth for
// which state changes are legal. Route handlers must call isValidTransition
// before mutating an incident's state rather than checking state ad hoc.
import { INCIDENT_STATES } from '../models/schema.js';

export function isValidTransition(from, to) {
  const fromIndex = INCIDENT_STATES.indexOf(from);
  const toIndex = INCIDENT_STATES.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }
  return toIndex === fromIndex + 1;
}

export function getNextState(state) {
  const index = INCIDENT_STATES.indexOf(state);
  if (index === -1 || index === INCIDENT_STATES.length - 1) {
    return null;
  }
  return INCIDENT_STATES[index + 1];
}

export default isValidTransition;
