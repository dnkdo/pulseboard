// Process entry point — importing this module initializes the database
// automatically, satisfying "no manual migration step" on startup.
import { initDatabase } from './models/db.js';
import { SEVERITIES, INCIDENT_STATES } from './models/schema.js';

const db = initDatabase(process.env.PLB_DB_PATH || ':memory:');

export { initDatabase, db, SEVERITIES, INCIDENT_STATES };
export default db;
