import React from 'react';
import { useIncidentStatus } from '../../hooks/useIncidentStatus.js';
import { getStateChipProps } from './stateChips.js';
import { chipStyle, chipNeutralStyle } from './Chip.styles.js';

// Renders an incident's lifecycle state as a colored chip. Reads live from
// useIncidentStatus (which polls GET /api/incidents/:id) rather than taking
// `state` as a static prop, so a PATCH-driven status change flows down and
// re-renders the chip without a page reload.
export function Chip({ incidentId, pollIntervalMs, fetchImpl }) {
  const { status, loading, error } = useIncidentStatus(incidentId, { pollIntervalMs, fetchImpl });

  if (!incidentId) {
    return (
      <span data-testid="state-chip-empty" style={chipNeutralStyle}>
        No incident selected
      </span>
    );
  }

  if (!status && loading) {
    return (
      <span data-testid="state-chip-loading" style={chipNeutralStyle}>
        Loading…
      </span>
    );
  }

  if (!status && error) {
    return (
      <span data-testid="state-chip-error" style={chipNeutralStyle}>
        Unknown
      </span>
    );
  }

  const { label, token } = getStateChipProps(status);

  return (
    <span data-testid="state-chip" data-state={status} style={chipStyle(token)}>
      {label}
    </span>
  );
}

export default Chip;
