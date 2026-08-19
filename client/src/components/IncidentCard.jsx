import { useNavigate } from 'react-router-dom';
import styles from './IncidentCard.module.css';
import SeverityBadge from './SeverityBadge.jsx';
import { getIncidentStatusColor } from './incidentStatusColors.js';

function formatTimestamp(raw) {
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
}

function formatLabel(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Unknown';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Isolated from the component so it can be unit-tested without rendering:
// navigates to the public incident detail route (client/src/routes/index.jsx,
// "/status/incidents/:incidentId") for the clicked card's incident.
export function onCardClick(navigate, incidentId) {
  navigate(`/status/incidents/${incidentId}`);
}

function onCardKeyDown(event, navigate, incidentId) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onCardClick(navigate, incidentId);
  }
}

export default function IncidentCard({ incident }) {
  const navigate = useNavigate();
  const timestamp = formatTimestamp(incident.timestamp ?? incident.createdAt ?? incident.created_at);

  return (
    <div
      className={`${styles.card} ${styles.clickable}`}
      data-testid="incident-card"
      data-incident-id={incident.id}
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(navigate, incident.id)}
      onKeyDown={(event) => onCardKeyDown(event, navigate, incident.id)}
    >
      <div className={styles.header}>
        <span className={styles.title}>{incident.title ?? 'Untitled incident'}</span>
        <span className={styles.badges}>
          <SeverityBadge severity={incident.severity} testId="incident-severity-badge" className={styles.badge} />
          <span
            className={styles.badge}
            data-testid="incident-status-badge"
            style={{ backgroundColor: getIncidentStatusColor(incident.status) }}
          >
            {formatLabel(incident.status)}
          </span>
        </span>
      </div>
      {timestamp && <span className={styles.timestamp}>{timestamp}</span>}
    </div>
  );
}
