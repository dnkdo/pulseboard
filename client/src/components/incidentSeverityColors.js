// Severity -> badge color for the public status page, mirroring the
// token-module pattern used by healthTileStatus.js in this same directory.
//
// Deliberately does not import src/theme/tokens.js (that module is scoped to
// the internal dashboard's dark theme per CLAUDE.md's public/internal
// styling separation) — these hex values are the same sev1/sev2/sev3 tokens
// from .adlc/design/tokens.json, restated here for the light-theme surface.
const SEVERITY_COLORS = {
  SEV1: '#EF4444', // token: colors.sev1
  SEV2: '#F97316', // token: colors.sev2
  SEV3: '#FBBF24', // token: colors.sev3
  critical: '#EF4444', // token: colors.sev1
  major: '#F97316', // token: colors.sev2
  minor: '#FBBF24', // token: colors.sev3
  low: '#94A3B8', // token: colors.text-muted-light (no dedicated "low" token)
};

const UNKNOWN_SEVERITY_COLOR = '#94A3B8'; // token: colors.text-muted-light

export function getIncidentSeverityColor(severity) {
  return SEVERITY_COLORS[severity] ?? UNKNOWN_SEVERITY_COLOR;
}
