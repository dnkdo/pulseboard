// Internal-dashboard stat cards: fetches GET /api/stats on mount and again
// after any incident state transition, so cards never show stale values.
// Uses React.createElement (no JSX) since this workspace has no JSX build
// step wired up yet.
import { createElement as h, useCallback, useEffect, useState } from 'react';
import { INCIDENTS_CHANGED_EVENT } from './incidentList.js';

const STAT_FIELDS = [
  { key: 'openIncidents', label: 'Open Incidents' },
  { key: 'mttr7d', label: '7-Day MTTR (min)' },
  { key: 'incidentsThisMonth', label: 'Incidents This Month' },
  { key: 'uptimePercentage', label: 'Uptime %' },
];

export async function fetchStatCards() {
  const res = await fetch('/api/stats');
  if (!res.ok) {
    throw new Error(`GET /api/stats failed: ${res.status}`);
  }
  return res.json();
}

export async function resolveIncident(incidentId, nextState) {
  const res = await fetch(`/api/incidents/${incidentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: nextState }),
  });
  if (!res.ok) {
    throw new Error(`PATCH /api/incidents/${incidentId} failed: ${res.status}`);
  }
  return res.json();
}

export function useStatCards() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const next = await fetchStatCards();
      setStats(next);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Any PATCH triggered elsewhere in the app (e.g. IncidentList) dispatches
  // this event so stat cards refresh without a manual reload, per AC4 —
  // decoupled from IncidentList so neither component needs a reference to
  // the other's internal refetch function.
  useEffect(() => {
    window.addEventListener(INCIDENTS_CHANGED_EVENT, refetch);
    return () => window.removeEventListener(INCIDENTS_CHANGED_EVENT, refetch);
  }, [refetch]);

  return { stats, error, refetch };
}

export default function StatCardsDashboard({ incidentId } = {}) {
  const { stats, error, refetch } = useStatCards();

  const handleResolve = useCallback(async () => {
    await resolveIncident(incidentId, 'resolved');
    await refetch();
  }, [incidentId, refetch]);

  if (error) {
    return h('div', { role: 'alert', 'data-testid': 'stat-cards-error' }, error);
  }

  if (!stats) {
    return h('div', { 'data-testid': 'stat-cards-loading' }, 'Loading stats…');
  }

  return h(
    'div',
    { 'data-testid': 'stat-cards' },
    STAT_FIELDS.map((field) =>
      h(
        'div',
        { key: field.key, 'data-testid': `stat-card-${field.key}` },
        h('span', null, field.label),
        h('span', { 'data-testid': `stat-value-${field.key}` }, String(stats[field.key]))
      )
    ),
    incidentId
      ? h(
          'button',
          { type: 'button', 'data-testid': 'resolve-incident-button', onClick: handleResolve },
          'Resolve incident'
        )
      : null
  );
}
