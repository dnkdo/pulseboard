#!/usr/bin/env node
// Scans src/ for hardcoded SEV1/SEV2/SEV3 severity hex literals living
// outside the canonical token module (src/theme/tokens.js). Per DESIGN.md's
// "severity colors are semantic-only" hard rule, every severity-colored file
// (severityColors.js, Timeline.styles.js, etc.) must reference the token
// constants — never redeclare the raw hex — so this fails non-zero the
// moment that's violated.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SEV1_COLOR, SEV2_COLOR, SEV3_COLOR } from '../src/theme/tokens.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC_DIR = path.join(repoRoot, 'src');
export const TOKEN_MODULE = path.join(repoRoot, 'src', 'theme', 'tokens.js');
const SCAN_EXTENSIONS = new Set(['.js', '.jsx']);
export const SEVERITY_HEX_VALUES = Object.freeze([SEV1_COLOR, SEV2_COLOR, SEV3_COLOR]);

export function listSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      return [];
    }
    return [fullPath];
  });
}

// Returns [{ file, hex }] for every non-token-module file that contains a raw
// severity hex literal. An empty array means the audit passes.
export function findSeverityColorViolations(files, { tokenModule = TOKEN_MODULE } = {}) {
  const violations = [];
  for (const file of files) {
    if (path.resolve(file) === path.resolve(tokenModule)) {
      continue;
    }
    const contents = readFileSync(file, 'utf-8').toUpperCase();
    for (const hex of SEVERITY_HEX_VALUES) {
      if (contents.includes(hex.toUpperCase())) {
        violations.push({ file, hex });
      }
    }
  }
  return violations;
}

function main() {
  const files = listSourceFiles(SRC_DIR);
  const violations = findSeverityColorViolations(files);

  if (violations.length > 0) {
    console.error('Severity color usage audit failed — raw severity hex literals found outside the token module:');
    for (const { file, hex } of violations) {
      console.error(`  ${path.relative(repoRoot, file)}: ${hex}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Severity color usage audit passed — no raw severity hex literals outside src/theme/tokens.js.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
