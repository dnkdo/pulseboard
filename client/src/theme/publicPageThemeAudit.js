// AC2 static-scan companion to severityAudit.js (which proves AC1 — no
// severity color outside a severity indicator). This module proves the
// other half of the design contract: "All public status page components use
// the light-theme token set, not the internal dashboard's dark-theme
// tokens" (see CLAUDE.md's public/internal styling-separation rule and
// DESIGN.md's split-theme system).
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSourceFiles, stripComments } from './sourceScanUtils.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const CLIENT_SRC_DIR = path.resolve(moduleDir, '..');
export const REPO_ROOT = path.resolve(moduleDir, '../../..');
const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.css']);

const designTokens = JSON.parse(
  readFileSync(path.join(REPO_ROOT, '.adlc/design/tokens.json'), 'utf-8'),
);

// Hex values that belong ONLY to a "-dark" design-contract token, with no
// "-light" (or shared) token coincidentally sharing the same value. A few
// dark/light pairs in tokens.json DO share a hex (e.g. text-muted-dark ===
// text-muted-light) — those can't distinguish theme by hex alone, so they're
// deliberately excluded here rather than producing an unfalsifiable check.
// Pulled out as a pure function (rather than inlined at module scope) so a
// missing or malformed `colors` block in tokens.json — a real failure mode
// for a file the design pipeline regenerates — degrades to "no dark-only
// tokens known" instead of throwing during module import and taking down
// every consumer of this file.
export function computeDarkOnlyHex(colorsObj) {
  if (!colorsObj || typeof colorsObj !== 'object') {
    return [];
  }
  const lightAndSharedHex = new Set(
    Object.entries(colorsObj)
      .filter(([key]) => !key.endsWith('-dark'))
      .map(([, hex]) => String(hex).toUpperCase()),
  );
  return Object.entries(colorsObj)
    .filter(([key]) => key.endsWith('-dark'))
    .map(([, hex]) => String(hex).toUpperCase())
    .filter((hex) => !lightAndSharedHex.has(hex));
}

export const DARK_ONLY_HEX = Object.freeze(computeDarkOnlyHex(designTokens.colors));

// The internal dashboard's own dark-theme token module. Matched only as a
// quoted import specifier (not a bare substring) so an explanatory comment
// that merely names the file (see statusPageTokens.js's header) never
// counts as a violation.
const DASHBOARD_TOKEN_IMPORT = /from\s+['"]([^'"]*\/theme\/tokens\.js)['"]/;

// This module's own test file deliberately writes fixture strings containing
// dark-only hexes and a theme/tokens.js import specifier to prove the scan
// actually detects them (see publicPageThemeAudit.test.js) — exclude it from
// the real-tree scan the same way severityAudit.js exempts its own tests.
export const DEFAULT_ALLOWED_FILES = Object.freeze(['publicPageThemeAudit.test.js']);

export function findDarkThemeViolations({
  dir = CLIENT_SRC_DIR,
  allowedFiles = DEFAULT_ALLOWED_FILES,
} = {}) {
  const allowed = new Set(allowedFiles);
  const violations = [];
  for (const file of listSourceFiles(dir, SCAN_EXTENSIONS)) {
    if (allowed.has(path.basename(file))) {
      continue;
    }
    const raw = readFileSync(file, 'utf-8');
    const stripped = stripComments(raw, path.extname(file));
    const upper = stripped.toUpperCase();
    for (const hex of DARK_ONLY_HEX) {
      if (upper.includes(hex)) {
        violations.push({ file, hex, reason: 'dark-only-hex' });
      }
    }
    const importMatch = DASHBOARD_TOKEN_IMPORT.exec(stripped);
    if (importMatch) {
      violations.push({ file, specifier: importMatch[1], reason: 'dashboard-token-import' });
    }
  }
  return violations;
}

// Proves AC2's negative half for the real, live public status page tree:
// true iff nothing under `dir` references a dark-only design-contract color
// or imports the internal dashboard's token module.
export function validateNoDarkThemeUsage(options = {}) {
  return findDarkThemeViolations(options).length === 0;
}

const LOCAL_IMPORT_PATTERN = /import\s+[^;'"]*?from\s+['"](\.[^'"]+)['"]/g;

// Walks the real import graph starting at `entryFile` (default:
// status-page/StatusPage.jsx) and returns the set of every .jsx file under
// client/src/components that's transitively reachable from it — i.e. every
// component actually rendered on the public status page, discovered from
// the live source rather than a hand-maintained list. Used to prove a
// manually maintained component inventory (like
// tests/theme/severityColorAudit.test.tsx's COMPONENT_FILES) can't silently
// drift from what StatusPage.jsx actually composes.
export function discoverStatusPageComponentFiles({
  entryFile = path.join(CLIENT_SRC_DIR, 'status-page', 'StatusPage.jsx'),
} = {}) {
  const visited = new Set();
  const componentFiles = new Set();

  function visit(file) {
    if (visited.has(file) || !existsSync(file)) {
      return;
    }
    visited.add(file);
    const source = readFileSync(file, 'utf-8');
    for (const match of source.matchAll(LOCAL_IMPORT_PATTERN)) {
      const resolved = path.resolve(path.dirname(file), match[1]);
      if (
        path.extname(resolved) === '.jsx' &&
        resolved.startsWith(`${CLIENT_SRC_DIR}${path.sep}components${path.sep}`)
      ) {
        componentFiles.add(resolved);
      }
      if (/\.jsx?$/.test(resolved)) {
        visit(resolved);
      }
    }
  }

  visit(entryFile);
  return componentFiles;
}
