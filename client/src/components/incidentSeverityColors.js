// Severity -> badge color for the public status page. This is the ONLY
// module on the public status page permitted to reference
// statusPageTokens.colors.sev1/2/3 directly — its two consumers
// (IncidentCard's severity badge, PastIncidentsList's severity dot) are both
// severity indicators per DESIGN.md Hard Rule 1 ("severity colors ONLY for
// severity"). See severityTokenScope.test.js for the static-scan test that
// enforces no other file in this directory reuses these hex values.
import { colors } from '../theme/statusPageTokens.js';

const SEVERITY_COLORS = {
  SEV1: colors.sev1,
  SEV2: colors.sev2,
  SEV3: colors.sev3,
  critical: colors.sev1,
  major: colors.sev2,
  minor: colors.sev3,
  low: colors.textMutedLight, // no dedicated "low" severity token
};

const UNKNOWN_SEVERITY_COLOR = colors.textMutedLight;

export function getIncidentSeverityColor(severity) {
  return SEVERITY_COLORS[severity] ?? UNKNOWN_SEVERITY_COLOR;
}
