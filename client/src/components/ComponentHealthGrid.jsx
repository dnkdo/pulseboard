import { useMemo } from 'react';
import styles from './ComponentHealthGrid.module.css';
import CategorySection from './CategorySection.jsx';
import { fetchComponents } from '../lib/api/components.js';
import { useStatusPolling } from '../hooks/useStatusPolling.js';
import { groupComponentsByCategory } from '../utils/groupComponentsByCategory.js';

// Polls GET /api/components (via fetchComponents, injectable as fetchImpl
// for tests) through the shared useStatusPolling primitive, mirroring
// ActiveIncidentsList/PastIncidentsList's use of useIncidentPolling. State
// only updates when the payload actually differs from the last poll, so a
// component's health tile updates the next tick after its healthState
// changes with no manual refresh, and identical consecutive polls don't
// re-render the grid.
//
// Components are grouped by category (PLB-103) and rendered as one
// CategorySection per distinct category present in the payload. Grouping is
// memoized on the raw components payload so an unrelated polling re-render
// (e.g. an unchanged payload bumping state) doesn't recompute it.
export default function ComponentHealthGrid({ pollIntervalMs, fetchImpl = fetchComponents }) {
  const { data, status } = useStatusPolling({ fetchImpl, pollIntervalMs });
  const grouped = useMemo(() => groupComponentsByCategory(data ?? []), [data]);

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
    <div className={styles.sections} data-testid="component-health-grid">
      {Object.entries(grouped)
        .filter(([, tiles]) => tiles.length > 0)
        .map(([category, tiles]) => (
          <CategorySection key={category} category={category} components={tiles} />
        ))}
    </div>
  );
}
