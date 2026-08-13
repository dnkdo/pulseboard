// Canonical enum source of truth for incident severities and workflow states.
// Pure module — no DB or side effects, safe to import standalone.

export const SEVERITIES = Object.freeze(['SEV1', 'SEV2', 'SEV3']);

// Workflow order matters — this is the sequential transition order, not alphabetical.
export const INCIDENT_STATES = Object.freeze(['open', 'investigating', 'identified', 'resolved']);
