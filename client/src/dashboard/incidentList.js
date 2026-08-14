// Internal-dashboard incident list: the only place in the shipped app where
// a real user can trigger PATCH /api/incidents/:id, so it's what makes the
// "stat cards refresh after a PATCH" requirement reachable end-to-end rather
// than only reachable through the StatCardsDashboard component's own test
// harness. Uses React.createElement (no JSX) to match dashboard/index.js —
// this workspace has no JSX build step wired up yet.
import { createElement as h, useCallback, useEffect, useState } from 'react';
import { getNextState } from '../../../src/lib/incidentState.js';

// Fired after any successful state transition so unrelated components
// (StatCardsDashboard) can refetch without IncidentList holding a reference
// to their internal refetch function.
export const INCIDENTS_CHANGED_EVENT = 'pulseboard:incidents-changed';

export async function fetchIncidents() {
  const res = await fetch('/api/incidents');
  if (!res.ok) {
    throw new Error(`GET /api/incidents failed: ${res.status}`);
  }
  return res.json();
}

export async function advanceIncident(incidentId, nextState) {
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

export default function IncidentList() {
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const next = await fetchIncidents();
      setIncidents(Array.isArray(next) ? next : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleAdvance = useCallback(
    async (incident) => {
      const nextState = getNextState(incident.state);
      if (!nextState) {
        return;
      }
      try {
        await advanceIncident(incident.id, nextState);
        await refetch();
        window.dispatchEvent(new Event(INCIDENTS_CHANGED_EVENT));
      } catch (err) {
        setError(err.message);
      }
    },
    [refetch]
  );

  if (error) {
    return h('div', { role: 'alert', 'data-testid': 'incident-list-error' }, error);
  }

  if (!incidents) {
    return h('div', { 'data-testid': 'incident-list-loading' }, 'Loading incidents…');
  }

  return h(
    'ul',
    { 'data-testid': 'incident-list' },
    incidents.map((incident) => {
      const nextState = getNextState(incident.state);
      return h(
        'li',
        { key: incident.id, 'data-testid': `incident-row-${incident.id}` },
        h('span', null, `${incident.title} — ${incident.state}`),
        nextState
          ? h(
              'button',
              {
                type: 'button',
                'data-testid': `advance-incident-${incident.id}`,
                onClick: () => handleAdvance(incident),
              },
              `Advance to ${nextState}`
            )
          : null
      );
    })
  );
}
