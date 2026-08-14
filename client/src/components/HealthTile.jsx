import styles from './HealthTile.module.css';
import { formatUptimePercentage } from '../lib/uptime.js';
import { getHealthTileStatusMeta } from './healthTileStatus.js';

// GET /api/components reports uptimePercent on a 0-100 scale;
// formatUptimePercentage expects a 0-1 ratio, so it's converted at this one call site.
export default function HealthTile({ name, status, uptimePercent }) {
  const meta = getHealthTileStatusMeta(status);

  return (
    <div className={styles.tile} data-status={status}>
      <div className={styles.header}>
        <span
          className={styles.dot}
          style={{ backgroundColor: meta.color }}
          data-testid="health-tile-dot"
          aria-hidden="true"
        />
        <span className={styles.name}>{name}</span>
      </div>
      <div className={styles.status}>{meta.label}</div>
      <div className={styles.uptime}>{formatUptimePercentage(uptimePercent / 100)} uptime</div>
    </div>
  );
}
