import styles from './ActiveIncidentsList.module.css';
import IncidentCard from './IncidentCard.jsx';
import { useIncidentPolling } from '../hooks/useIncidentPolling.js';

// Renders one IncidentCard per active (non-resolved) incident, polling
// GET /api/incidents live so a card disappears on its own the next tick
// after the incident's status flips to 'resolved' — no manual refresh.
export default function ActiveIncidentsList({ pollIntervalMs, fetchImpl }) {
  const { activeIncidents, isLoading, error } = useIncidentPolling({ pollIntervalMs, fetchImpl });

  if (isLoading) {
    return <p className={styles.message}>Loading active incidents…</p>;
  }

  if (error) {
    return (
      <p role="alert" className={styles.message}>
        Unable to load active incidents.
      </p>
    );
  }

  if (activeIncidents.length === 0) {
    return (
      <p className={styles.message} data-testid="active-incidents-empty">
        No active incidents.
      </p>
    );
  }

  return (
    <div className={styles.list} data-testid="active-incidents-list">
      {activeIncidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} />
      ))}
    </div>
  );
}
