// Status -> badge color for the public status page's active-incident cards.
// A light-theme-scoped restatement of DESIGN.md's state-chip color rules
// (open: gray, investigating: blue, identified: slate); resolved is omitted
// since resolved incidents never reach this card (see src/lib/incidents.js).
//
// "open"/"active" previously hardcoded gray-500 (#6B7280), a value with no
// entry in .adlc/design/tokens.json — Hard Rule 2 requires every value to
// come from the token set, so it now uses the closest defined neutral token
// (text-muted-light) instead.
import { colors } from '../theme/statusPageTokens.js';

const STATUS_COLORS = {
  open: colors.textMutedLight, // token: colors.text-muted-light
  active: colors.textMutedLight, // token: colors.text-muted-light — non-canonical alias for "open"
  investigating: colors.statusInvestigating, // token: colors.status-investigating
  identified: colors.textSecondaryLight, // token: colors.text-secondary-light (slate)
};

const UNKNOWN_STATUS_COLOR = colors.textMutedLight;

export function getIncidentStatusColor(status) {
  return STATUS_COLORS[status] ?? UNKNOWN_STATUS_COLOR;
}
