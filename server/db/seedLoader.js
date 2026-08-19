// Seed-loader adapter for the server package. The canonical deterministic
// seed dataset (src/data/seed/*.json) and its loader (seedIfFresh) already
// exist and are exercised by tests/seed.test.js and src/models/__tests__ —
// built for PLB-67/PLB-66. This module intentionally does not duplicate that
// fixture data or re-derive the empty-check/insert logic; it exposes the
// same behavior under the module path this task's contract requires,
// delegating to the single source of truth instead of introducing a second,
// divergent seed dataset (see CLAUDE.md: "don't add a new persistence path").
import path from 'node:path';
import os from 'node:os';
import { initDatabase } from '../../src/models/db.js';
import { seedIfFresh } from '../../src/models/seed.js';

function isDatabaseHandle(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.prepare === 'function';
}

// Accepts either an already-open better-sqlite3 handle, or an identifier
// string naming a fresh database to open under the OS temp dir (used by
// callers — including the fixed test-contract invocation
// loadSeedDataIfEmpty("freshEmptyDb") — that only have a name, not a handle).
function resolveDatabase(dbOrPath) {
  if (isDatabaseHandle(dbOrPath)) {
    return dbOrPath;
  }
  if (typeof dbOrPath === 'string' && dbOrPath.length > 0) {
    return initDatabase(path.join(os.tmpdir(), `${dbOrPath}.sqlite`));
  }
  return initDatabase(':memory:');
}

// Zero-manual-step entry point: seeds the given (or resolved) database only
// when it is empty, and is a no-op — not an error — on every later call.
export function loadSeedDataIfEmpty(dbOrPath) {
  const db = resolveDatabase(dbOrPath);
  return seedIfFresh(db);
}

export default loadSeedDataIfEmpty;
