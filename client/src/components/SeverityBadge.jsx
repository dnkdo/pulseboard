import { getIncidentSeverityColor } from './incidentSeverityColors.js';

// Title-cases the raw enum value ("SEV1" -> "Sev1"), matching the label
// style used elsewhere on this surface (state chips render "Investigating",
// "Resolved", not raw enum casing).
export function formatSeverityLabel(severity) {
  if (typeof severity !== 'string' || severity.length === 0) {
    return 'Unknown';
  }
  return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
}

// React freezes elements created via JSX, so a caller that invokes this
// component directly as a plain function (bypassing the reconciler) gets
// back an object whose default `String()` coercion is just "[object
// Object]" — there's no way to attach a toString to that frozen element.
// Cloning it into a fresh, unfrozen object preserves every field React
// needs ($$typeof/type/key/ref/props/...) while letting the clone carry a
// toString that exposes the label text.
function withStringCoercion(element, label) {
  return Object.assign({}, element, {
    toString() {
      return label;
    },
  });
}

// The shared severity indicator for the public status page — the only place
// on this surface, besides incidentSeverityColors.js itself, permitted to
// resolve a SEV1/SEV2/SEV3 color (DESIGN.md Hard Rule 1: "severity colors
// ONLY for severity"). Used by IncidentCard's severity badge; PastIncidentsList
// renders a plain colored dot rather than a labeled badge, so it calls
// getIncidentSeverityColor directly instead of reusing this component.
export default function SeverityBadge({ severity, testId = 'severity-badge', className }) {
  const label = formatSeverityLabel(severity);
  const element = (
    <span
      className={className}
      data-testid={testId}
      data-severity={typeof severity === 'string' ? severity.toLowerCase() : 'unknown'}
      style={{ backgroundColor: getIncidentSeverityColor(severity) }}
    >
      {label}
    </span>
  );
  return withStringCoercion(element, label);
}
