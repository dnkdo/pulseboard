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

// Fallback for a severity value outside SEV1/2/3 (e.g. malformed data).
// Deliberately a muted slate, never a severity hue, so an unknown value
// can't be mistaken for a real SEV1/2/3 marker. token: colors.text-muted-dark
export const NEUTRAL_SEVERITY_COLOR = '#94A3B8';

// Dark theme tokens for the internal dashboard (stat cards, timeline, state
// chips), mirrored 1:1 from the *-dark entries in .adlc/design/tokens.json
// per DESIGN.md's "Internal Dashboard (Dark)" theme foundation. Centralizing
// these here means StatCards/Timeline/Chip reference a single source of
// truth instead of each inlining its own copy of the same hex literals.
export const darkTheme = Object.freeze({
  background: '#0F172A', // colors.surface-primary-dark
  surface: '#1E293B', // colors.surface-secondary-dark
  surfaceRaised: '#334155', // colors.surface-tertiary-dark
  text: '#F1F5F9', // colors.text-primary-dark
  textSecondary: '#CBD5E1', // colors.text-secondary-dark
  textMuted: '#94A3B8', // colors.text-muted-dark
  textOnColor: '#FFFFFF', // DESIGN.md Badges & Chips: "solid background with white text"
  border: '#475569', // colors.border-dark
});
