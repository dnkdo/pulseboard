// Shared Express app + SQLite singleton for integration tests, mirroring
// the app/db import pattern already used by tests/routes/incidents.post.test.js.
// The app factory (server/src/app.js) wires its routers directly onto the
// shared db singleton (src/index.js) rather than accepting one as a
// parameter, so "isolated per test" here means resetting that shared
// store's rows between tests, not constructing a separate app instance.
import app from '../../server/src/app.js';
import db from '../../src/index.js';
import { resetIncidentStore } from '../../server/store/incidentStore.js';

export function resetIncidents() {
  resetIncidentStore(db);
}

export default app;
