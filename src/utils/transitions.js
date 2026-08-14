// Pure transition-history sorter — used by the incident detail view to render
// state transitions oldest-first regardless of the order the API returns them in.

export function sortTransitions(transitions) {
  return transitions.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
