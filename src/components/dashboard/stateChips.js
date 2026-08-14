import { STATE_OPEN, STATE_INVESTIGATING, STATE_IDENTIFIED, STATE_RESOLVED } from '../../theme/tokens.js';

// Maps each of the four canonical incident states (src/models/schema.js#INCIDENT_STATES)
// to its chip label and design token. Kept separate from severity styling so a
// SEV1/2/3 color can never accidentally leak into state-chip rendering.
const STATE_CHIP_PROPS = Object.freeze({
  open: Object.freeze({ label: 'Open', token: STATE_OPEN }),
  investigating: Object.freeze({ label: 'Investigating', token: STATE_INVESTIGATING }),
  identified: Object.freeze({ label: 'Identified', token: STATE_IDENTIFIED }),
  resolved: Object.freeze({ label: 'Resolved', token: STATE_RESOLVED }),
});

// Unknown states throw rather than falling back to a default chip, so a
// bad/typo'd status value fails loudly instead of silently mislabeling an
// incident in the UI — mirrors getSeverityColor's unknown-input handling.
export function getStateChipProps(state) {
  const props = STATE_CHIP_PROPS[state];
  if (!props) {
    const known = Object.keys(STATE_CHIP_PROPS).join(', ');
    throw new Error(`getStateChipProps: unknown state "${state}" — expected one of ${known}`);
  }
  return props;
}
