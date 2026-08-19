import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TransitionHistory from '../components/TransitionHistory/index.js';
import { getIncidentById } from '../lib/api/incidents.js';
import styles from './IncidentDetailPage.module.css';

// Internal dashboard incident detail view, mounted at /incidents/:incidentId
// (client/src/routes/index.jsx). `status` is a single enum rather than
// separate loading/error/notFound booleans so the render branches below stay
// mutually exclusive by construction. Renders every field the internal
// GET /api/incidents/:id record carries (src/controllers/incidentsController.js's
// serializeIncident is the internal detail endpoint and applies no public
// field filtering) rather than re-filtering client-side.
export default function IncidentDetailPage({ getIncidentByIdImpl = getIncidentById }) {
  const { incidentId } = useParams();
  const [status, setStatus] = useState('loading');
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  const handleRetry = useCallback(() => setRetryToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    getIncidentByIdImpl(incidentId)
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (data === null) {
          setStatus('not-found');
          return;
        }
        setIncident(data);
        setStatus('success');
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setError(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [incidentId, retryToken, getIncidentByIdImpl]);

  if (status === 'loading') {
    return (
      <p className={styles.message} data-testid="incident-detail-loading">
        Loading incident…
      </p>
    );
  }

  if (status === 'not-found') {
    return (
      <p className={styles.message} data-testid="incident-detail-not-found">
        Incident not found.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className={styles.message} data-testid="incident-detail-error">
        <p>Unable to load incident{error ? `: ${error}` : '.'}</p>
        <button type="button" data-testid="incident-detail-retry" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="incident-detail" className={styles.page}>
      <section data-testid="incident-detail-fields" className={styles.fields}>
        <h2 data-testid="incident-detail-title">{incident.title}</h2>
        <dl>
          <dt>Severity</dt>
          <dd data-testid="incident-detail-severity">{incident.severity}</dd>
          <dt>Status</dt>
          <dd data-testid="incident-detail-status">{incident.status}</dd>
          <dt>Summary</dt>
          <dd data-testid="incident-detail-summary">{incident.summary}</dd>
          <dt>Affected components</dt>
          <dd data-testid="incident-detail-affected-components">
            {Array.isArray(incident.affectedComponents) ? incident.affectedComponents.join(', ') : ''}
          </dd>
        </dl>
      </section>
      <section data-testid="incident-detail-transitions">
        <h3>Transition History</h3>
        <TransitionHistory transitions={incident.stateHistory} />
      </section>
    </div>
  );
}
