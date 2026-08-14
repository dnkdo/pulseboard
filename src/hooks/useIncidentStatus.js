import { useEffect, useState } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 4000;

// Polls GET /api/incidents/:id so a chip always reflects the DB's current
// status field rather than caching/inferring state client-side — the PATCH
// endpoint (src/lib/incidentState.js's validator, mounted server-side) is the
// only writer, this hook only ever reads. `fetchImpl` is injectable so tests
// can drive it deterministically instead of hitting a real network/timer.
export function useIncidentStatus(incidentId, options = {}) {
  const { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, fetchImpl = fetch } = options;
  const [state, setState] = useState({ status: null, loading: true, error: null });

  useEffect(() => {
    if (!incidentId) {
      setState({ status: null, loading: false, error: null });
      return undefined;
    }

    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetchImpl(`/api/incidents/${incidentId}`);
        if (!response.ok) {
          throw new Error(`useIncidentStatus: failed to fetch incident "${incidentId}" (status ${response.status})`);
        }
        const incident = await response.json();
        if (!cancelled) {
          setState({ status: incident.status ?? incident.state, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error }));
        }
      }
    }

    fetchStatus();
    const intervalId = setInterval(fetchStatus, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [incidentId, pollIntervalMs, fetchImpl]);

  return state;
}
