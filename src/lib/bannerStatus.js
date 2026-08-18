// Pure aggregation of the public banner status from a list of active
// incidents. Framework-agnostic (no Express/React imports) so it can be
// imported from both the server and client, per the "shared module"
// framing in PLB-90.
//
// Re-derivation on resolution (AC #4) falls out for free: this function
// has no notion of "resolved" incidents at all. Callers always pass the
// *current* active-incidents list (already filtered upstream by
// src/lib/incidentPartition.js or src/lib/incidents.js#filterActiveIncidents),
// so calling computeBannerStatus again after a resolved incident has been
// dropped from that list naturally re-derives the next-highest-severity
// incident's state — no special resolution-handling branch is needed here.

// Ranked highest to lowest, keyed by lowercased severity string. Mirrors
// the tolerant vocabulary already established in src/lib/incidents.js so
// ranking never drifts from how severity is ranked elsewhere in the
// codebase: it accepts both the canonical SEV1/SEV2/SEV3 enum
// (src/models/schema.js) and the plain-language critical/major/minor/low
// vocabulary incidents may arrive with from other producers. Unranked or
// unknown severities sort last.
const SEVERITY_RANK = Object.freeze({
  sev1: 4,
  critical: 4,
  sev2: 3,
  major: 3,
  sev3: 2,
  minor: 2,
  low: 1,
});

function severityRank(severity) {
  if (typeof severity !== 'string') {
    return 0;
  }
  return SEVERITY_RANK[severity.toLowerCase()] ?? 0;
}

// Returns the highest-severity incident's own lifecycle state when it has
// one (e.g. 'investigating', 'resolving'), falling back to its severity
// otherwise. Ties at the same severity rank resolve to whichever incident
// was encountered first in the array — a stable, deterministic rule so
// tied input never produces flaky output.
export function computeBannerStatus(activeIncidents) {
  if (!Array.isArray(activeIncidents) || activeIncidents.length === 0) {
    return 'operational';
  }

  const highest = activeIncidents.reduce((current, incident) =>
    severityRank(incident?.severity) > severityRank(current?.severity) ? incident : current,
  );

  return highest.state ?? highest.severity;
}

export default computeBannerStatus;
