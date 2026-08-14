// Component health-state -> display label + color, mirroring the token-module
// pattern used for severity colors and state chips elsewhere in the app.
//
// tokens.json only defines two status colors today (status-operational,
// status-investigating); there is no dedicated component-outage palette yet.
// Outage severities below intentionally reuse the sev1/sev2/sev3 tokens,
// which DESIGN.md otherwise scopes to incident timeline/badges/chips — this
// is a flagged design gap, not a new hardcoded color.
const STATUS_META = {
  operational: { label: 'Operational', color: '#10B981' }, // status-operational
  degraded: { label: 'Degraded Performance', color: '#FBBF24' }, // sev3
  partial_outage: { label: 'Partial Outage', color: '#F97316' }, // sev2
  major_outage: { label: 'Major Outage', color: '#EF4444' }, // sev1
};

const UNKNOWN_META = { label: 'Unknown', color: '#94A3B8' }; // text-muted-light

export function getHealthTileStatusMeta(status) {
  return STATUS_META[status] ?? UNKNOWN_META;
}
