// AC1 static-scan: "No SEV1/SEV2/SEV3 color token is applied to any
// non-severity UI element on the public status page." Scans the real,
// live client/src tree (not a directory that only contains its own
// exempted file) so a genuine violation is actually detectable.
//
// scripts/color-usage-audit.js runs the equivalent scan for the internal
// dashboard's src/ tree; this module is its public-status-page counterpart,
// since that script deliberately never walks client/src (see its header
// comment).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, SEVERITY_COLOR_KEYS } from './statusPageTokens.js';
import { listSourceFiles as listFilesByExtension, stripComments } from './sourceScanUtils.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const CLIENT_SRC_DIR = path.resolve(moduleDir, '..');
const SCAN_EXTENSIONS = new Set(['.js', '.jsx']);
export const SEVERITY_HEX_VALUES = Object.freeze(SEVERITY_COLOR_KEYS.map((key) => colors[key]));

// Files allowed to reference a raw severity hex directly: the token
// definition module, the severity-color mapping module (the sole approved
// entry point every severity indicator must go through), and their tests.
export const DEFAULT_ALLOWED_FILES = Object.freeze([
  'statusPageTokens.js',
  'statusPageTokens.test.js',
  'incidentSeverityColors.js',
  'incidentSeverityColors.test.js',
  'SeverityBadge.jsx',
  'SeverityBadge.test.jsx',
]);

export function listSourceFiles(dir) {
  return listFilesByExtension(dir, SCAN_EXTENSIONS);
}

// Returns [{ file, hex }] for every non-allow-listed file under `dir` that
// contains a raw SEV1/SEV2/SEV3 hex literal, ignoring hits inside comments
// (e.g. "// token: colors.sev1 (red)") so an explanatory comment about a
// severity color never counts as the UI element actually using it. An empty
// array means no non-severity UI element is using a severity color.
export function findSeverityTokenViolations({
  dir = CLIENT_SRC_DIR,
  allowedFiles = DEFAULT_ALLOWED_FILES,
} = {}) {
  const allowed = new Set(allowedFiles);
  const violations = [];
  for (const file of listSourceFiles(dir)) {
    if (allowed.has(path.basename(file))) {
      continue;
    }
    const contents = stripComments(readFileSync(file, 'utf-8'), path.extname(file)).toUpperCase();
    for (const hex of SEVERITY_HEX_VALUES) {
      if (contents.includes(hex.toUpperCase())) {
        violations.push({ file, hex });
      }
    }
  }
  return violations;
}

// Proves AC1 for the real public status page tree: true iff no file outside
// the approved severity-indicator modules contains a raw severity hex.
export function validateSeverityTokenUsage(options = {}) {
  return findSeverityTokenViolations(options).length === 0;
}
