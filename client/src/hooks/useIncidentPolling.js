import { filterActiveIncidents, sortPastIncidentsDesc } from '../../../src/lib/incidents.js';
import { fetchIncidents } from '../lib/api/incidents.js';
import { useStatusPolling } from './useStatusPolling.js';

// Polls GET /api/incidents (via fetchIncidents, injectable as fetchImpl for
// tests) through the shared useStatusPolling primitive, and re-derives both
// the active and past lists from the same fetch on every tick, so the two
// status-page sections share one poll cycle instead of double-fetching.
// useStatusPolling only updates state when the payload actually differs
// from the last one, so identical consecutive polls don't re-render. Once
// the API flips an incident's status to 'resolved', the next tick naturally
// moves it from activeIncidents to pastIncidents and React re-renders
// without it — no manual publish/refresh action, and no separate
// 'published' flag involved.
export function useIncidentPolling({ pollIntervalMs, fetchImpl = fetchIncidents } = {}) {
  const { data, status, error } = useStatusPolling({ fetchImpl, pollIntervalMs });
  const incidents = data ?? [];

  return {
    activeIncidents: filterActiveIncidents(incidents),
    pastIncidents: sortPastIncidentsDesc(incidents),
    isLoading: status === 'loading',
    error,
  };
}

export default useIncidentPolling;
