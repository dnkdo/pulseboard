// Process entry point — importing this module initializes the database and
// seeds it automatically when empty, satisfying "no manual setup step" on
// startup for both schema creation and fixture loading.
import { initDatabase } from './models/db.js';
import { SEVERITIES, INCIDENT_STATES } from './models/schema.js';
import { isFreshDatabase, seedDatabase, seedIfFresh } from './models/seed.js';

// Guarded rather than a bare top-level call: this module is imported eagerly
// by the serverless function entrypoint (server/src/app.js), so a init-time
// throw here (bad PLB_DB_PATH, native-binding load failure, read-only FS)
// would crash module import for every route on that function, including
// GET /api/health, which must stay up independent of DB availability.
function initializeDb() {
  try {
    const database = initDatabase(process.env.PLB_DB_PATH || ':memory:');
    seedIfFresh(database);
    return database;
  } catch (error) {
    console.error('Database initialization failed at startup:', error);
    return null;
  }
}

const db = initializeDb();

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
