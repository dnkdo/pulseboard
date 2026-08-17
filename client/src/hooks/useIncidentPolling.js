import { useEffect, useState } from 'react';
import { filterActiveIncidents, sortPastIncidentsDesc } from '../../../src/lib/incidents.js';
import { fetchIncidents } from '../lib/api/incidents.js';

const DEFAULT_POLL_INTERVAL_MS = 30000;

// Polls GET /api/incidents (via fetchIncidents, injectable as fetchImpl for
// tests) and re-derives both the active and past lists from the same fetch
// on every tick, so the two status-page sections share one poll cycle
// instead of double-fetching. Once the API flips an incident's status to
// 'resolved', the next tick naturally moves it from activeIncidents to
// pastIncidents and React re-renders without it — no manual publish/refresh
// action, and no separate 'published' flag involved.
export function useIncidentPolling({ pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, fetchImpl = fetchIncidents } = {}) {
  const [state, setState] = useState({ activeIncidents: [], pastIncidents: [], isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const incidents = await fetchImpl();
        if (!cancelled) {
          setState({
            activeIncidents: filterActiveIncidents(incidents),
            pastIncidents: sortPastIncidentsDesc(incidents),
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false, error }));
        }
      }
    }

    poll();
    const intervalId = setInterval(poll, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [pollIntervalMs, fetchImpl]);

  return state;
}

export default useIncidentPolling;
