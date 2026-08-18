// Component health-state -> display label + color, mirroring the
// token-module pattern used for severity colors and state chips elsewhere in
// the app.
//
// AC1 fix: this previously reused the sev1/sev2/sev3 severity tokens for
// major_outage/partial_outage/degraded. DESIGN.md Hard Rule 1 scopes those
// colors to "incident timeline, severity badges, state chips only" — a
// component health tile is none of those, so that was a real violation
// (see severityTokenScope.test.js). tokens.json has no dedicated
// outage-escalation palette yet (only status-operational is defined for
// health indicators), so non-operational states are differentiated on a
// neutral/investigating scale instead of inventing a new hex value:
//   operational -> status-operational (green, per DESIGN.md's explicit
//     "component health indicators" use case for that token)
//   degraded -> text-muted-light (mildest, lightest neutral)
//   partial_outage -> status-investigating (blue, an active-issue signal)
//   major_outage -> text-primary-light (darkest, highest-contrast neutral)
// Flagged design gap: a real 3-step outage-severity palette (distinct from
// SEV1/2/3) would read better than this token-set reuse and should be added
// to .adlc/design/tokens.json in a future design pass.
import { colors } from '../theme/statusPageTokens.js';

const STATUS_META = {
  operational: { label: 'Operational', color: colors.statusOperational },
  degraded: { label: 'Degraded Performance', color: colors.textMutedLight },
  partial_outage: { label: 'Partial Outage', color: colors.statusInvestigating },
  major_outage: { label: 'Major Outage', color: colors.textPrimaryLight },
};

const UNKNOWN_META = { label: 'Unknown', color: colors.textMutedLight };

export function getHealthTileStatusMeta(status) {
  return STATUS_META[status] ?? UNKNOWN_META;
}
