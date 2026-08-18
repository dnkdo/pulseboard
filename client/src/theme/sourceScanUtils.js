// Shared helpers for the public status page's static color-token scans
// (severityAudit.js, publicPageThemeAudit.js) — kept in one place so both
// scans strip comments identically instead of each hand-rolling a
// slightly-different comment regex, and so a raw hex mentioned only in an
// explanatory comment (e.g. "token: colors.sev1 (red)") never counts as a
// real usage.
import { readdirSync } from 'node:fs';
import path from 'node:path';

export function stripComments(source, extension) {
  let stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (extension !== '.css') {
    // CSS has no `//` line-comment syntax; stripping it there would corrupt
    // real values (e.g. URLs) that happen to contain a double slash.
    stripped = stripped.replace(/\/\/.*$/gm, '');
  }
  return stripped;
}

export function listSourceFiles(dir, extensions) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath, extensions);
    }
    if (!extensions.has(path.extname(entry.name))) {
      return [];
    }
    return [fullPath];
  });
}
