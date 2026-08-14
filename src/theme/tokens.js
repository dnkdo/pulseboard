// Design tokens for the internal dashboard (dark theme).
//
// State-chip tokens live in a distinct gray/slate/blue/green hue family from
// the SEV1/SEV2/SEV3 severity palette (red/orange/yellow), per DESIGN.md's
// "severity colors are semantic-only" rule and its Badges & Chips guidance
// (open: gray, investigating: blue, identified: slate, resolved: green).
// STATE_INVESTIGATING and STATE_RESOLVED mirror colors.status-investigating
// and colors.status-operational in .adlc/design/tokens.json exactly.
export const STATE_OPEN = '#6B7280'; // gray-500 — not yet triaged
export const STATE_INVESTIGATING = '#3B82F6'; // token: colors.status-investigating (blue)
export const STATE_IDENTIFIED = '#475569'; // token: colors.border-dark (slate)
export const STATE_RESOLVED = '#10B981'; // token: colors.status-operational (green)

// Severity tokens, mirrored from colors.sev1/sev2/sev3 in
// .adlc/design/tokens.json. Reserved for incident severity only — never for
// chip/state styling — so state-token tests can assert non-overlap.
export const SEV1_COLOR = '#EF4444'; // token: colors.sev1 (red)
export const SEV2_COLOR = '#F97316'; // token: colors.sev2 (orange)
export const SEV3_COLOR = '#FBBF24'; // token: colors.sev3 (yellow)
