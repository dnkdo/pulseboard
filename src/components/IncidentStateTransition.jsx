import { useEffect, useRef, useState } from 'react';
import { getNextState } from '../lib/incidentState.js';
import { getStateChipProps } from './dashboard/stateChips.js';
import { postIncidentTransition } from '../api/incidentTransitionApi.js';
import { advanceButtonStyle, transitionErrorStyle } from './IncidentStateTransition.styles.js';

// Single incident state-advance control (dashboard incident detail/list
// view). Derives the one legal next state from getNextState (the sequential
// validator's source of truth, src/lib/incidentState.js) on every render —
// never caches or optimistically updates it — so a failed PATCH can never
// leave this component's view of `incident` out of sync with the prop it
// was given. `error` is the only local state; it drives the inline banner
// and never touches the incident representation itself.
export function IncidentStateTransition({
  incident,
  onTransitioned,
  postIncidentTransitionImpl = postIncidentTransition,
}) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const currentState = incident?.state ?? incident?.status;
  const nextState = getNextState(currentState);

  if (!nextState) {
    return null;
  }

  const { label: nextLabel } = getStateChipProps(nextState);

  async function handleClick() {
    setSubmitting(true);
    setError(null);

    try {
      const updated = await postIncidentTransitionImpl(incident.id, nextState);
      if (!mountedRef.current) {
        return;
      }
      setSubmitting(false);
      onTransitioned?.(updated);
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }
      setSubmitting(false);
      setError(err?.message || 'Failed to transition incident. Please try again.');
    }
  }

  return (
    <div data-testid="incident-state-transition">
      {error && (
        <div data-testid="incident-state-transition-error" role="alert" style={transitionErrorStyle}>
          {error}
        </div>
      )}
      <button
        type="button"
        data-testid="incident-state-transition-button"
        onClick={handleClick}
        disabled={submitting}
        style={advanceButtonStyle(submitting)}
      >
        {submitting ? 'Updating…' : `Mark as ${nextLabel}`}
      </button>
    </div>
  );
}

export default IncidentStateTransition;
