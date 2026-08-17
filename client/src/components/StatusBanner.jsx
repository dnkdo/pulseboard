import styles from './StatusBanner.module.css';
import { fetchIncidents } from '../lib/api/incidents.js';
import { useStatusPolling } from '../hooks/useStatusPolling.js';
import { computeOverallStatus } from '../../../src/lib/status.js';
import { getIncidentSeverityColor } from './incidentSeverityColors.js';

const OPERATIONAL_COLOR = '#10B981'; // token: colors.status-operational

// Aggregate banner shown at the top of the public status page: "All Systems
// Operational" or the highest-severity active incident's label, per
// DESIGN.md layout pattern 2. Self-polls GET /api/incidents (via
// fetchIncidents, injectable as fetchImpl for tests) through the shared
// useStatusPolling primitive, mirroring ComponentHealthGrid/
// ActiveIncidentsList/PastIncidentsList's independent-polling pattern, and
// derives the aggregate via the shared, already-tested computeOverallStatus
// (src/lib/status.js) so the banner's rule never drifts from that module.
export default function StatusBanner({ pollIntervalMs, fetchImpl = fetchIncidents }) {
  const { data, status } = useStatusPolling({ fetchImpl, pollIntervalMs });

  if (status === 'loading') {
    return (
      <div className={styles.banner} data-testid="status-banner">
        <p className={styles.message}>Loading status…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.banner} role="alert" data-testid="status-banner">
        <p className={styles.message}>Unable to load status.</p>
      </div>
    );
  }

  const overall = computeOverallStatus(data ?? []);
  const dotColor = overall.status === 'operational' ? OPERATIONAL_COLOR : getIncidentSeverityColor(overall.severity);

  return (
    <div className={styles.banner} data-testid="status-banner" data-status={overall.status}>
      <span className={styles.dot} style={{ backgroundColor: dotColor }} aria-hidden="true" />
      <span className={styles.label}>{overall.label}</span>
    </div>
  );
}
