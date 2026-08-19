import { Link } from 'react-router-dom';
import styles from './PublicIncidentDetail.module.css';

// Dedicated not-found state for PublicIncidentDetail (PLB-97 step 4) — kept
// as its own component, distinct from the generic fetch/network error state,
// so a customer looking up a bad/old incident id gets an accurate "this
// incident doesn't exist" message rather than a message implying the status
// page itself is broken.
export default function IncidentNotFound() {
  return (
    <div className={styles.notFound} data-testid="public-incident-detail-not-found">
      <p className={styles.message}>This incident could not be found.</p>
      <Link className={styles.backLink} to="/status">
        Back to status page
      </Link>
    </div>
  );
}
