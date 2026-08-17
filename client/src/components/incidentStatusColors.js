// Status -> badge color for the public status page's active-incident cards.
// A light-theme-scoped restatement of DESIGN.md's state-chip color rules
// (open: gray, investigating: blue, identified: slate); resolved is omitted
// since resolved incidents never reach this card (see src/lib/incidents.js).
const STATUS_COLORS = {
  open: '#6B7280', // gray-500
  active: '#6B7280', // gray-500 — non-canonical alias for "open"
  investigating: '#3B82F6', // token: colors.status-investigating
  identified: '#475569', // token: colors.text-secondary-light (slate)
};

const UNKNOWN_STATUS_COLOR = '#94A3B8'; // token: colors.text-muted-light

export function getIncidentStatusColor(status) {
  return STATUS_COLORS[status] ?? UNKNOWN_STATUS_COLOR;
}
