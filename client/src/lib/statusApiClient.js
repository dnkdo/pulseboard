import { fetchIncidents } from './api/incidents.js';
import { fetchComponents } from './api/components.js';

// Combines the incident and component fetch wrappers into a single snapshot
// call so a caller that needs both (the public status page as a whole) can
// share one poll cycle via useStatusPolling instead of running two
// independent interval timers. Each underlying wrapper already throws on a
// non-2xx response, so a failure in either fetch rejects this Promise.all.
export async function fetchStatusSnapshot() {
  const [incidents, components] = await Promise.all([fetchIncidents(), fetchComponents()]);
  return { incidents, components };
}

export default fetchStatusSnapshot;
