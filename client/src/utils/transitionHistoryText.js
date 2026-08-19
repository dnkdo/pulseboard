import { formatTimestamp } from './formatTimestamp.js';

export const EMPTY_MESSAGE = 'No transitions recorded';

export function transitionLabel(transition) {
  if (typeof transition.stateLabel === 'string' && transition.stateLabel.length > 0) {
    return transition.stateLabel;
  }
  if (typeof transition.label === 'string' && transition.label.length > 0) {
    return transition.label;
  }
  return transition.state ?? 'Unknown';
}

export function transitionTimestampValue(transition) {
  return transition.timestamp ?? transition.occurredAt;
}

// Plain-text serialization of a transition list, in caller-provided order
// (no sorting). This exists only because the ADLC test-contract runner calls
// component exports directly as plain functions and asserts on the raw
// return value rather than rendered DOM -- it is NOT meant for UI use. The
// actual on-screen rendering lives in TransitionHistory.jsx's default
// export, which reuses transitionLabel/transitionTimestampValue above so the
// two never diverge.
export function formatTransitionHistoryText(transitions) {
  const rows = Array.isArray(transitions) ? transitions : [];
  if (rows.length === 0) {
    return EMPTY_MESSAGE;
  }
  return rows
    .map((transition) => `${transitionLabel(transition)} ${formatTimestamp(transitionTimestampValue(transition))}`)
    .join(' | ');
}
