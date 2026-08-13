// Component data access — loads the deterministic JSON seed fixtures.
// Pure read of a fixture file; no DB connection or mutation.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

export function loadComponents() {
  const filePath = path.join(DATA_DIR, 'components.json');
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export default loadComponents;
