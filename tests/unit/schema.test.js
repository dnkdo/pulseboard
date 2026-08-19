// PLB-121: schema module contract tests. SEVERITIES / INCIDENT_STATES already
// live at src/models/schema.js (built for PLB-66) and the SQLite tables they
// drive already auto-create on process startup with no manual migration step
// (src/models/db.js, wired into both src/index.js and the Express entry
// point at server/src/index.js via server/src/app.js). These tests bind the
// three PLB-121 acceptance criteria directly to that existing single source
// of truth instead of introducing a second, competing schema/db module.
import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { SEVERITIES, INCIDENT_STATES } from '../../src/models/schema.js';
import { initDatabase } from '../../src/models/db.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const serverRoot = path.join(repoRoot, 'server');

const tempFiles = [];

afterEach(() => {
  while (tempFiles.length) {
    fs.rmSync(tempFiles.pop(), { force: true });
  }
});

function tempDbPath() {
  const file = path.join(os.tmpdir(), `plb-121-${Math.random().toString(36).slice(2)}.sqlite`);
  tempFiles.push(file);
  return file;
}

describe('SEVERITIES (acceptance criterion: exact set of 3 severities)', () => {
  it('is exactly SEV1, SEV2, SEV3', () => {
    expect(SEVERITIES).toEqual(['SEV1', 'SEV2', 'SEV3']);
  });

  it('does not contain an invented severity value', () => {
    expect(SEVERITIES).not.toContain('SEV0');
    expect(SEVERITIES).not.toContain('SEV4');
    expect(SEVERITIES).toHaveLength(3);
  });
});

describe('INCIDENT_STATES (acceptance criterion: exact 4 states in workflow order)', () => {
  it('is exactly open, investigating, identified, resolved in that order', () => {
    expect(INCIDENT_STATES).toEqual(['open', 'investigating', 'identified', 'resolved']);
  });

  it('places resolved last and open first, matching the sequential transition order', () => {
    expect(INCIDENT_STATES[0]).toBe('open');
    expect(INCIDENT_STATES[INCIDENT_STATES.length - 1]).toBe('resolved');
  });
});

describe('database auto-initialization on Express startup (acceptance criterion: no manual migration step)', () => {
  it('boots the real Express entry point against a brand-new db file and ends up with all 3 tables present', async () => {
    const dbPath = tempDbPath();
    expect(fs.existsSync(dbPath)).toBe(false);

    const port = 3997;
    const child = spawn(process.execPath, ['src/index.js'], {
      cwd: serverRoot,
      env: { ...process.env, PORT: String(port), PLB_DB_PATH: dbPath },
    });

    try {
      await new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        const timeout = setTimeout(() => {
          reject(new Error(`server did not report listening. stdout=${stdout} stderr=${stderr}`));
        }, 10000);

        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
          if (/listening on port/i.test(stdout)) {
            clearTimeout(timeout);
            resolve();
          }
        });
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        child.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
        child.on('exit', (code) => {
          if (code !== null && code !== 0) {
            clearTimeout(timeout);
            reject(new Error(`server exited early with code ${code}. stderr=${stderr}`));
          }
        });
      });

      expect(fs.existsSync(dbPath)).toBe(true);

      const db = new Database(dbPath, { readonly: true });
      const tableNames = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((row) => row.name);
      db.close();

      expect(tableNames).toEqual(
        expect.arrayContaining(['components', 'incidents', 'incident_state_transitions']),
      );
    } finally {
      if (!child.killed) {
        child.kill();
      }
    }
  });

  it('calling initDatabase twice against the same nonexistent file requires no manual migration step', () => {
    const dbPath = tempDbPath();
    expect(fs.existsSync(dbPath)).toBe(false);

    const first = initDatabase(dbPath);
    const namesAfterFirst = first
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name);
    first.close();

    expect(() => initDatabase(dbPath)).not.toThrow();
    const second = initDatabase(dbPath);
    const namesAfterSecond = second
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name);
    second.close();

    expect(namesAfterFirst).toEqual(namesAfterSecond);
    expect(namesAfterSecond).toEqual(
      expect.arrayContaining(['components', 'incidents', 'incident_state_transitions']),
    );
  });
});
