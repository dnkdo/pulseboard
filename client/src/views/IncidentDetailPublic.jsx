import TransitionHistory from '../components/TransitionHistory/TransitionHistory.jsx';

// Public status-page incident detail view. Exposes only customer-safe
// fields (title and state transition history — stateHistory carries no
// internal-only metadata) and reuses the same TransitionHistory component
// as the internal view so state-label/timestamp rendering never diverges
// between the two surfaces.
export default function IncidentDetailPublic({ incident }) {
  if (!incident) {
    return <p data-testid="incident-detail-public-empty">Incident not found.</p>;
  }

  return (
    <article data-testid="incident-detail-public">
      <h2>{incident.title ?? 'Untitled incident'}</h2>
      <h3>Status Updates</h3>
      <TransitionHistory transitions={incident.stateHistory ?? []} />
    </article>
  );
}
