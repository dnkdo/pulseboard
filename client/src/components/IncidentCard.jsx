import styles from './IncidentCard.module.css';
import { getIncidentSeverityColor } from './incidentSeverityColors.js';
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

export default function IncidentCard({ incident }) {
  const timestamp = formatTimestamp(incident.timestamp ?? incident.createdAt ?? incident.created_at);

  return (
    <div className={styles.card} data-testid="incident-card" data-incident-id={incident.id}>
      <div className={styles.header}>
        <span className={styles.title}>{incident.title ?? 'Untitled incident'}</span>
        <span className={styles.badges}>
          <span
            className={styles.badge}
            data-testid="incident-severity-badge"
            style={{ backgroundColor: getIncidentSeverityColor(incident.severity) }}
          >
            {formatLabel(incident.severity)}
          </span>
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
