// AC1: "No SEV1/SEV2/SEV3 color token is applied to any non-severity UI
// element on the public status page." severityTokenScope.test.js proves this
// at the whole-tree level (client/src has zero stray severity hex literals);
// this module proves it per-component, against the real, live public status
// page tree (client/src/components + client/src/status-page) — not a
// placeholder directory that only contains its own exempted file.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, SEVERITY_COLOR_KEYS } from '../../client/src/theme/statusPageTokens.js';
import { discoverStatusPageComponentFiles } from '../../client/src/theme/publicPageThemeAudit.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..', '..');

// Logical component name -> its real, live source file (relative to repo
// root). Every entry here is an actually-rendered part of the public status
// page (client/src/status-page/StatusPage.jsx composes all of them) — never
// an orphaned file that nothing imports.
const COMPONENT_FILES = Object.freeze({
  Header: 'client/src/components/StatusPageHeader.jsx',
  Banner: 'client/src/components/StatusBanner.jsx',
  ComponentHealthGrid: 'client/src/components/ComponentHealthGrid.jsx',
  HealthTile: 'client/src/components/HealthTile.jsx',
  ActiveIncidentsList: 'client/src/components/ActiveIncidentsList.jsx',
  IncidentCard: 'client/src/components/IncidentCard.jsx',
  PastIncidentsList: 'client/src/components/PastIncidentsList.jsx',
  SeverityBadge: 'client/src/components/SeverityBadge.jsx',
});

// Modules that are the sanctioned entry point to a severity color — importing
// one of these means the component renders (or can render) a severity token,
// directly or through SeverityBadge.
const SEVERITY_ENTRY_POINT_IMPORTS = Object.freeze([
  './incidentSeverityColors.js',
  './SeverityBadge.jsx',
]);

// Returns the sorted list of severity token keys (a subset of
// ["sev1","sev2","sev3"]) that `componentName`'s real source file applies.
// Empty array means the component never touches a severity color — the
// expected result for layout chrome (header, footer, generic containers).
export function extractSeverityTokensFromComponent(componentName) {
  const relativePath = COMPONENT_FILES[componentName];
  if (!relativePath) {
    return [];
  }
  const source = readFileSync(path.join(repoRoot, relativePath), 'utf-8');
  const upperSource = source.toUpperCase();

  const literalHits = SEVERITY_COLOR_KEYS.filter((key) =>
    upperSource.includes(colors[key].toUpperCase()),
  );
  if (literalHits.length > 0) {
    return literalHits.sort();
  }

  const usesSeverityEntryPoint = SEVERITY_ENTRY_POINT_IMPORTS.some((specifier) =>
    source.includes(specifier),
  );
  return usesSeverityEntryPoint ? [...SEVERITY_COLOR_KEYS].sort() : [];
}

describe('extractSeverityTokensFromComponent', () => {
  it('finds no severity token on the page header (AC1: chrome is never a severity indicator)', () => {
    expect(extractSeverityTokensFromComponent('Header')).toEqual([]);
  });

  it('finds no severity token on the component health grid or its tiles', () => {
    expect(extractSeverityTokensFromComponent('ComponentHealthGrid')).toEqual([]);
    expect(extractSeverityTokensFromComponent('HealthTile')).toEqual([]);
  });

  it('finds no severity token on the active incidents list container (a plain IncidentCard list, no coloring of its own)', () => {
    expect(extractSeverityTokensFromComponent('ActiveIncidentsList')).toEqual([]);
  });

  it('does find severity tokens on the dedicated SeverityBadge indicator (proves the scan is real)', () => {
    expect(extractSeverityTokensFromComponent('SeverityBadge')).toEqual(['sev1', 'sev2', 'sev3']);
  });

  it('does find severity tokens on IncidentCard, PastIncidentsList, and the overall-status banner (legitimate severity indicators)', () => {
    expect(extractSeverityTokensFromComponent('IncidentCard')).toEqual(['sev1', 'sev2', 'sev3']);
    expect(extractSeverityTokensFromComponent('PastIncidentsList')).toEqual([
      'sev1',
      'sev2',
      'sev3',
    ]);
    expect(extractSeverityTokensFromComponent('Banner')).toEqual(['sev1', 'sev2', 'sev3']);
  });

  it('returns an empty array for an unknown component name instead of throwing', () => {
    expect(extractSeverityTokensFromComponent('NotARealComponent')).toEqual([]);
  });
});

describe('COMPONENT_FILES stays in sync with the real render tree', () => {
  it('matches exactly the .jsx components transitively reachable from StatusPage.jsx, so a new component cannot be silently missed', () => {
    // COMPONENT_FILES above is hand-maintained; discoverStatusPageComponentFiles
    // walks StatusPage.jsx's real import graph instead. If someone adds a new
    // component to the public status page and forgets to list it here, this
    // set-equality check — not a human re-reading the render tree — catches it.
    const discovered = new Set(
      [...discoverStatusPageComponentFiles()].map((f) =>
        path.relative(repoRoot, f).split(path.sep).join('/'),
      ),
    );
    expect(new Set(Object.values(COMPONENT_FILES))).toEqual(discovered);
  });
});
