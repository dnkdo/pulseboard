// Process entry point — importing this module initializes the database and
// seeds it automatically when empty, satisfying "no manual setup step" on
// startup for both schema creation and fixture loading.
import { initDatabase } from './models/db.js';
import { SEVERITIES, INCIDENT_STATES } from './models/schema.js';
import { isFreshDatabase, seedDatabase, seedIfFresh } from './models/seed.js';

const db = initDatabase(process.env.PLB_DB_PATH || ':memory:');
seedIfFresh(db);

export {
  initDatabase,
  db,
  SEVERITIES,
  INCIDENT_STATES,
  isFreshDatabase,
  seedDatabase,
  seedIfFresh,
};
export default db;
