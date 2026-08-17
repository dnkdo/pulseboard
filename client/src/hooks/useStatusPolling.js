import { useEffect, useRef, useState } from 'react';
import { hasStatusStateChanged } from '../utils/diffStatusState.js';
import { POLL_INTERVAL_MS } from '../config/index.js';

const INITIAL_STATE = { data: undefined, status: 'loading', error: null };

// Hoisted so its identity is stable across renders when the caller doesn't
// override it — an inline default parameter would be a fresh function every
// render, which (being part of the effect's dependency array) would re-run
// the effect and re-fetch on every state update.
const defaultIsEqual = (a, b) => !hasStatusStateChanged(a, b);

// Generic polling primitive shared by anything that needs live backend data
// on the public status page. Fires an immediate fetch on mount so callers
// render seeded data on cold start without waiting for the first interval
// tick, then re-fetches every `pollIntervalMs`. A new payload only triggers
// a state update (and therefore a re-render) when it's structurally
// different from the last one, via `isEqual`/diffStatusState — identical
// consecutive polls are dropped, so e.g. an incident's status flipping to
// 'resolved' produces exactly one update while an unchanged payload
// produces none. An in-flight guard skips a tick if the previous fetch for
// this hook instance is still pending, so a slow response overlapping the
// next interval doesn't stack requests.
export function useStatusPolling({
  fetchImpl,
  pollIntervalMs = POLL_INTERVAL_MS,
  isEqual = defaultIsEqual,
} = {}) {
  const [state, setState] = useState(INITIAL_STATE);
  const dataRef = useRef(undefined);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      try {
        const payload = await fetchImpl();
        if (cancelled) {
          return;
        }
        if (!isEqual(dataRef.current, payload)) {
          dataRef.current = payload;
          setState({ data: payload, status: 'ready', error: null });
        } else {
          setState((prev) =>
            prev.status === 'ready' && prev.error === null
              ? prev
              : { ...prev, status: 'ready', error: null },
          );
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, status: 'error', error }));
        }
      } finally {
        inFlightRef.current = false;
      }
    }

    poll();
    const intervalId = setInterval(poll, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [fetchImpl, pollIntervalMs, isEqual]);

  return state;
}

export default useStatusPolling;
