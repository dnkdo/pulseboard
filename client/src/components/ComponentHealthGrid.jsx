import { useEffect, useState } from 'react';
import styles from './ComponentHealthGrid.module.css';
import HealthTile from './HealthTile.jsx';
import { fetchComponents } from '../lib/api/components.js';

const POLL_INTERVAL_MS = 30000;

export default function ComponentHealthGrid() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchComponents();
        if (cancelled) return;
        setComponents(data);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return <p className={styles.message}>Loading component status…</p>;
  }

  if (error) {
    return (
      <p role="alert" className={styles.message}>
        Unable to load component status.
      </p>
    );
  }

  return (
    <div className={styles.grid}>
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
