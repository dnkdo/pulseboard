import { Link } from 'react-router-dom';
import styles from './IncidentTimeline.module.css';

function formatTimestamp(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString();
}

// Purely presentational: renders whatever `incidents` it's given, in the
// order given. Ordering/filtering is TimelineContainer's job (server-side,
// via GET /api/incidents?<buildFilterQueryString(...)>) — this component
// never fetches and never second-guesses the list it's handed, so a filter
// change is guaranteed to show up here as soon as the parent re-renders.
export default function IncidentTimeline({ incidents, isLoading, error }) {
  if (isLoading) {
    return <div data-testid="incident-timeline-loading">Loading timeline…</div>;
  }

  if (error) {
    return (
      <div role="alert" data-testid="incident-timeline-error">
        Unable to load incident timeline
      </div>
    );
  }

  if (!incidents || incidents.length === 0) {
    return <div data-testid="incident-timeline-empty">No incidents match the current filters</div>;
  }

  return (
    <ul data-testid="incident-timeline">
      {incidents.map((incident) => (
        <li
          key={incident.id}
          data-testid={`incident-timeline-entry-${incident.id}`}
          data-severity={incident.severity}
        >
          <Link to={`/incidents/${incident.id}`} className={styles.entryLink}>
            <span data-testid="incident-timeline-severity">{incident.severity}</span>
            <span data-testid="incident-timeline-title">{incident.title}</span>
            <span data-testid="incident-timeline-timestamp">{formatTimestamp(incident.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
