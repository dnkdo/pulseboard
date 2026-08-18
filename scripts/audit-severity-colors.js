#!/usr/bin/env node
// CI lint gate for the severity color restriction audit (see
// src/lib/severityAudit.js for the scan/allowlist logic). Fails non-zero the
// moment a SEV1/SEV2/SEV3 color token is referenced outside the
// timeline/severity-badge allowlist — e.g. a stat card or chip reaching for
// a severity hue directly instead of its own state/health token.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanForViolations } from '../src/lib/severityAudit.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function groupByFile(violations) {
  const grouped = new Map();
  for (const violation of violations) {
    if (!grouped.has(violation.file)) {
      grouped.set(violation.file, []);
    }
    grouped.get(violation.file).push(violation);
  }
  return grouped;
}

function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : repoRoot;
  const violations = scanForViolations(targetDir);

  if (violations.length > 0) {
    console.error('Severity color restriction audit failed — severity color tokens found outside the timeline/severity-badge allowlist:');
    for (const [file, fileViolations] of groupByFile(violations)) {
      console.error(`  ${file}`);
      for (const { line, token } of fileViolations) {
        console.error(`    line ${line}: ${token}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log('Severity color restriction audit passed — no severity color tokens found outside the timeline/severity-badge allowlist.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
