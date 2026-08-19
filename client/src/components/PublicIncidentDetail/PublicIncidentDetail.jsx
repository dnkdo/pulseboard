import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TransitionHistory from '../TransitionHistory/index.js';
import SeverityBadge from '../SeverityBadge.jsx';
import { getIncidentStatusColor } from '../incidentStatusColors.js';
import { getIncidentById } from '../../lib/api/incidents.js';
import IncidentNotFound from './IncidentNotFound.jsx';
import styles from './PublicIncidentDetail.module.css';

// Public status page's per-incident detail view, mounted at
// /status/incidents/:incidentId (client/src/routes/index.jsx). Unlike the
// internal IncidentDetailPage (client/src/pages/IncidentDetailPage.jsx),
// which renders the full internal incident record straight from
// GET /api/incidents/:id, this component is customer-facing: no dedicated
// public-scoped endpoint exists on the server yet (only GET /api/incidents/:id,
// which returns the full internal record — see CLAUDE.md's public/internal
// field separation note), so the allow-list below is the only thing standing
// between an internal-only field (e.g. internalNotes, assignee) and the
// public DOM.
//
// toPublicViewModel destructures only the fields safe to expose and builds a
// fresh object from them — it never spreads or forwards the raw fetched
// incident — so a future backend regression that adds a new internal field
// to the payload is excluded by construction, not by remembering to filter
// it out.
function toPublicViewModel(incident) {
  if (incident == null) {
    return null;
  }

  const { title, severity, status, affectedComponents, stateHistory } = incident;

  return {
    title,
    severity,
    status,
    affectedComponents: Array.isArray(affectedComponents) ? affectedComponents : [],
    transitions: Array.isArray(stateHistory) ? stateHistory : [],
  };
}

export default function PublicIncidentDetail({ getIncidentByIdImpl = getIncidentById }) {
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
        setIncident(toPublicViewModel(data));
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
      <p className={styles.message} data-testid="public-incident-detail-loading">
        Loading incident…
      </p>
    );
  }

  if (status === 'not-found') {
    return <IncidentNotFound />;
  }

  if (status === 'error') {
    return (
      <div role="alert" className={styles.message} data-testid="public-incident-detail-error">
        <p>Unable to load incident{error ? `: ${error}` : '.'}</p>
        <button type="button" data-testid="public-incident-detail-retry" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="public-incident-detail" className={styles.page}>
      <section data-testid="public-incident-detail-fields" className={styles.fields}>
        <h2 className={styles.title} data-testid="public-incident-detail-title">
          {incident.title}
        </h2>
        <div className={styles.badges}>
          <SeverityBadge severity={incident.severity} testId="public-incident-detail-severity" />
          <span
            className={styles.badge}
            data-testid="public-incident-detail-status"
            style={{ backgroundColor: getIncidentStatusColor(incident.status) }}
          >
            {incident.status}
          </span>
        </div>
        <dl>
          <dt>Affected components</dt>
          <dd data-testid="public-incident-detail-affected-components">
            {incident.affectedComponents.length > 0
              ? incident.affectedComponents.join(', ')
              : 'None'}
          </dd>
        </dl>
      </section>
      <section data-testid="public-incident-detail-transitions">
        <h3>Update History</h3>
        <TransitionHistory transitions={incident.transitions} />
      </section>
    </div>
  );
}
