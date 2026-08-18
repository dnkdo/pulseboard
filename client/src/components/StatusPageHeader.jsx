import styles from './StatusPageHeader.module.css';

// Page header for the public status page, per DESIGN.md layout pattern 1
// ("Header on surface-primary"). Static chrome only — no incident data, no
// polling, and (per DESIGN.md Hard Rule 1) no severity coloring, since a
// page title/tagline is never a severity indicator.
export default function StatusPageHeader() {
  return (
    <header className={styles.header} data-testid="status-page-header">
      <h1 className={styles.title}>Pulseboard Status</h1>
      <p className={styles.subtitle}>Current system status and incident history.</p>
    </header>
  );
}
