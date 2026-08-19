import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calculateUptime } from '../../src/services/uptime.js';
import { loadSeedComponents, loadSeedIncidents } from '../../src/models/seed.js';

// Re-exported so the .adlc test-contract case anchored at this file's own
// module path (tests/services/uptime.test.js :: calculateUptime) resolves
// to the same implementation exercised below, rather than importing a
// module that doesn't export the function under test.
export { calculateUptime };

const SOURCE_MODULE_PATH = fileURLToPath(new URL('../../src/services/uptime.js', import.meta.url));

// Fixed 100,000,000ms observation window shared by every seeded-component
// case below — chosen only so each component's real seed downtime divides
// out to a clean, exact percentage; it carries no calendar meaning.
const OBSERVATION_WINDOW_MS = 100_000_000;

function componentDowntimeMs(incidents, componentId) {
  return incidents
    .filter((incident) => incident.component_id === componentId)
    .reduce((total, incident) => {
      const duration = new Date(incident.updated_at).getTime() - new Date(incident.created_at).getTime();
      return total + duration;
    }, 0);
}

describe('calculateUptime', () => {
  it('returns the exact expected percentage for a fixed numeric input pair (test-contract case)', () => {
    expect(calculateUptime(0, 1000)).toBe(100);
  });

  it('returns the exact expected percentage for a second fixed numeric input pair (test-contract case)', () => {
    expect(calculateUptime(10, 100)).toBe(90);
  });

  it('performs no wall-clock reads (no Date.now()/new Date() in the source module)', () => {
    const source = readFileSync(SOURCE_MODULE_PATH, 'utf8');
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new Date/);
  });

  describe('against the fixed seed dataset', () => {
    const seedComponents = loadSeedComponents();
    const seedIncidents = loadSeedIncidents();

    // Hand-computed from src/data/seed/incidents.json: downtime per
    // component is the sum of (updated_at - created_at) across that
    // component's seeded incidents, evaluated against OBSERVATION_WINDOW_MS.
    const expectedUptimeByComponentId = {
      'seed-comp-api': 98.2,
      'seed-comp-web': 97.6,
      'seed-comp-db': 92.2,
      'seed-comp-auth': 89.5,
    };

    it('has an expected-uptime fixture for every seeded component', () => {
      expect(seedComponents.map((component) => component.id).sort()).toEqual(
        Object.keys(expectedUptimeByComponentId).sort(),
      );
    });

    it.each(seedComponents)('computes the exact seeded uptime percentage for $id', (component) => {
      const downtimeMs = componentDowntimeMs(seedIncidents, component.id);
      const uptimePercent = calculateUptime(downtimeMs, OBSERVATION_WINDOW_MS);
      expect(uptimePercent).toBe(expectedUptimeByComponentId[component.id]);
    });
  });
});
