// Canonical light-theme color tokens for the public status page, restated
// from .adlc/design/tokens.json (single source of truth — see
// statusPageTokens.test.js for the assertion these stay in sync with it).
//
// Every color-mapping module on this surface (incidentSeverityColors.js,
// incidentStatusColors.js, healthTileStatus.js) imports from here instead of
// redeclaring hex literals, so a design-contract color change is a one-file
// diff. Deliberately does not import src/theme/tokens.js at the repo root —
// that module is scoped to the internal dashboard's dark theme (see
// CLAUDE.md's public/internal styling separation).
export const colors = {
  sev1: '#EF4444', // token: colors.sev1 — severity indicators only (badges, timeline dots)
  sev2: '#F97316', // token: colors.sev2 — severity indicators only (badges, timeline dots)
  sev3: '#FBBF24', // token: colors.sev3 — severity indicators only (badges, timeline dots)
  statusOperational: '#10B981', // token: colors.status-operational
  statusInvestigating: '#3B82F6', // token: colors.status-investigating
  surfacePrimaryLight: '#FFFFFF', // token: colors.surface-primary-light
  surfaceSecondaryLight: '#F8FAFC', // token: colors.surface-secondary-light
  surfaceTertiaryLight: '#F1F5F9', // token: colors.surface-tertiary-light
  textPrimaryLight: '#1E293B', // token: colors.text-primary-light
  textSecondaryLight: '#475569', // token: colors.text-secondary-light
  textMutedLight: '#94A3B8', // token: colors.text-muted-light
  borderLight: '#E2E8F0', // token: colors.border-light
};

// Severity colors are reserved for severity indicators (incident severity
// badges/dots) per DESIGN.md Hard Rule 1 — never for component health,
// status chips, or other generic UI. Anything that needs to reference a
// severity hex directly (rather than through getIncidentSeverityColor)
// should be flagged for review.
export const SEVERITY_COLOR_KEYS = Object.freeze(['sev1', 'sev2', 'sev3']);
