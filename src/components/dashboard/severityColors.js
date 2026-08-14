import { SEV1_COLOR, SEV2_COLOR, SEV3_COLOR, NEUTRAL_SEVERITY_COLOR } from '../../theme/tokens.js';

// Maps each of the three canonical incident severities (src/models/schema.js#SEVERITIES)
// to its design token. Reuses the same SEV1_COLOR/SEV2_COLOR/SEV3_COLOR constants
// that back state-chip non-overlap checks, so severity coloring anywhere in the
// dashboard traces back to a single source of truth.
const SEVERITY_COLORS = Object.freeze({
  SEV1: SEV1_COLOR,
  SEV2: SEV2_COLOR,
  SEV3: SEV3_COLOR,
});

// Unlike getStateChipProps, an unrecognized severity falls back to a neutral
// token rather than throwing — severity coloring is a rendering concern, and
// a malformed/legacy severity value shouldn't take down the whole timeline.
export function getSeverityColor(severity) {
  return SEVERITY_COLORS[severity] ?? NEUTRAL_SEVERITY_COLOR;
}
