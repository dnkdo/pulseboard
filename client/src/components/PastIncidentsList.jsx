import styles from './PastIncidentsList.module.css';
import { useIncidentPolling } from '../hooks/useIncidentPolling.js';
import { getIncidentSeverityColor } from './incidentSeverityColors.js';

function formatResolvedDate(raw) {
  if (!raw) {
    return 'Unknown';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

function formatComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    return '—';
  }
  return components.join(', ');
}

// Renders one row per resolved incident, reverse-chronological by
// resolvedAt (per DESIGN.md layout pattern 5). Shares its poll cycle with
// ActiveIncidentsList's data source via useIncidentPolling, which derives
// both lists from the same GET /api/incidents fetch.
export default function PastIncidentsList({ pollIntervalMs, fetchImpl }) {
  const { pastIncidents, isLoading, error } = useIncidentPolling({ pollIntervalMs, fetchImpl });

  if (isLoading) {
    return <p className={styles.message}>Loading past incidents…</p>;
  }

  if (error) {
    return (
      <p role="alert" className={styles.message}>
        Unable to load past incidents.
      </p>
    );
  }

  if (pastIncidents.length === 0) {
    return (
      <p className={styles.message} data-testid="past-incidents-empty">
        No past incidents.
      </p>
    );
  }

  return (
    <table className={styles.table} data-testid="past-incidents-list">
      <thead>
        <tr>
          <th className={styles.header} scope="col">
            Incident
          </th>
          <th className={styles.header} scope="col">
            Component
          </th>
          <th className={styles.header} scope="col">
            Resolved
          </th>
        </tr>
      </thead>
      <tbody>
        {pastIncidents.map((incident) => (
          <tr
            key={incident.id}
            className={styles.row}
            data-testid="past-incident-row"
            data-incident-id={incident.id}
          >
            <td className={styles.cell}>
              <span
                className={styles.severityDot}
                data-testid="past-incident-severity-dot"
                style={{ backgroundColor: getIncidentSeverityColor(incident.severity) }}
              />
              {incident.title ?? 'Untitled incident'}
            </td>
            <td className={styles.cell}>{formatComponents(incident.affectedComponents)}</td>
            <td className={styles.cell}>{formatResolvedDate(incident.resolvedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
