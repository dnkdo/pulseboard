import styles from './ComponentHealthGrid.module.css';
import HealthTile from './HealthTile.jsx';
import { fetchComponents } from '../lib/api/components.js';
import { useStatusPolling } from '../hooks/useStatusPolling.js';

// Polls GET /api/components (via fetchComponents, injectable as fetchImpl
// for tests) through the shared useStatusPolling primitive, mirroring
// ActiveIncidentsList/PastIncidentsList's use of useIncidentPolling. State
// only updates when the payload actually differs from the last poll, so a
// component's health tile updates the next tick after its healthState
// changes with no manual refresh, and identical consecutive polls don't
// re-render the grid.
export default function ComponentHealthGrid({ pollIntervalMs, fetchImpl = fetchComponents }) {
  const { data, status } = useStatusPolling({ fetchImpl, pollIntervalMs });
  const components = data ?? [];

  if (status === 'loading') {
    return <p className={styles.message}>Loading component status…</p>;
  }

  if (status === 'error') {
    return (
      <p role="alert" className={styles.message}>
        Unable to load component status.
      </p>
    );
  }

  return (
    <div className={styles.grid} data-testid="component-health-grid">
      {components.map((component) => (
        <HealthTile
          key={component.id}
          name={component.name}
          status={component.healthState}
          uptimePercent={component.uptimePercent}
        />
      ))}
    </div>
  );
}
