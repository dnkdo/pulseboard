import TransitionHistory from '../components/TransitionHistory/TransitionHistory.jsx';

// Internal-dashboard incident detail view. Renders the full transition
// history via the shared TransitionHistory component, passing stateHistory
// through as-is (already ordered oldest-to-newest by the server) — this
// view does no sorting or field filtering of its own.
export default function IncidentDetailInternal({ incident }) {
  if (!incident) {
    return <p data-testid="incident-detail-internal-empty">Incident not found.</p>;
  }

  return (
    <article data-testid="incident-detail-internal">
      <h2>{incident.title ?? 'Untitled incident'}</h2>
      {incident.summary && <p data-testid="incident-detail-internal-summary">{incident.summary}</p>}
      <h3>Transition History</h3>
      <TransitionHistory transitions={incident.stateHistory ?? []} />
    </article>
  );
}
