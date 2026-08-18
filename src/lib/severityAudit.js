// Severity color restriction audit (internal dashboard).
//
// Per DESIGN.md's "severity colors are semantic-only" hard rule, the raw
// SEV1/SEV2/SEV3 color tokens (src/theme/tokens.js's SEV1_COLOR/SEV2_COLOR/
// SEV3_COLOR, and the client public-page equivalent colors.sev1/2/3) may
// only be referenced by the timeline and severity-badge components — never
// by stat cards, chips, or other generic UI. This module provides the
// static scan that enforces that: isAllowedFileForSeverityColor is a
// default-deny allowlist of exactly those component files, and
// scanForViolations walks real component source (.jsx/.tsx/.css — the
// files that actually render UI, not the .js token-definition/mapping
// modules that legitimately declare or re-export the tokens) looking for
// direct token usage outside that allowlist.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Matches every real severity-color-token spelling found in this codebase
// (colors.sev1/2/3 on the public status page, SEV1_COLOR/SEV2_COLOR/
// SEV3_COLOR on the internal dashboard) plus the camelCase and CSS custom
// property forms called for by the design-token spec, so a future token
// naming convention doesn't silently slip past the audit.
export const SEVERITY_COLOR_TOKEN_PATTERN =
  /--sev[1-3]-color|\bSEV[1-3]_COLOR\b|\bsev[1-3]Color\b|colors\.sev[1-3]\b|colors\[['"]sev[1-3]['"]\]/gi;

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '.vercel']);

// Only files that actually render/style UI are in scope for "does a
// severity color leak into non-severity UI" — the .js token-definition and
// color-mapping modules (tokens.js, severityColors.js, statusPageTokens.js,
// incidentSeverityColors.js, ...) legitimately declare or re-export these
// tokens and are audited separately (scripts/color-usage-audit.js,
// client/src/theme/severityAudit.js already cover that concern).
const SCAN_EXTENSIONS = new Set(['.jsx', '.tsx', '.css']);

const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;
const COMPONENTS_DIR_PATTERN = /(^|\/)components\//;
const ALLOWED_COMPONENT_NAME_PATTERN = /(SeverityBadge|Timeline)/;
const ALLOWED_EXTENSION_PATTERN = /\.(jsx?|tsx?)$/;

function toPosix(filePath) {
  return filePath.split(/[\\/]/).join('/');
}

// Default-deny: true only for timeline/severity-badge component files
// (any depth under a "components" directory, e.g. "SeverityBadge.jsx" or a
// nested "SeverityBadge/SeverityBadge.jsx", "SeverityTimeline.jsx",
// "Timeline.styles.js") — everything else, including the token-definition
// and color-mapping modules, returns false.
export function isAllowedFileForSeverityColor(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return false;
  }
  const normalized = toPosix(filePath).replace(/^\.\//, '');
  if (!COMPONENTS_DIR_PATTERN.test(normalized)) {
    return false;
  }
  const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
  return ALLOWED_EXTENSION_PATTERN.test(basename) && ALLOWED_COMPONENT_NAME_PATTERN.test(basename);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (!SCAN_EXTENSIONS.has(path.extname(entry.name)) || TEST_FILE_PATTERN.test(entry.name)) {
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

// Returns [{ file, line, token }] for every severity-color-token usage found
// outside the timeline/severity-badge allowlist, under rootDir. An empty
// array means the audit passes. `file` is POSIX-relative to rootDir.
export function scanForViolations(rootDir = '.') {
  const resolvedRoot = path.resolve(rootDir);
  const violations = [];

  for (const absoluteFile of walk(resolvedRoot)) {
    const relativeFile = toPosix(path.relative(resolvedRoot, absoluteFile));
    if (isAllowedFileForSeverityColor(relativeFile)) {
      continue;
    }

    const lines = readFileSync(absoluteFile, 'utf-8').split('\n');
    lines.forEach((line, index) => {
      const matches = line.match(SEVERITY_COLOR_TOKEN_PATTERN);
      if (!matches) {
        return;
      }
      for (const token of matches) {
        violations.push({ file: relativeFile, line: index + 1, token });
      }
    });
  }

  return violations;
}
