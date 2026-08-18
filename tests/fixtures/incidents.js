// POST /api/incidents payload builders for the resolve-incident-sync
// integration suite (tests/integration/resolve-incident-sync.test.js).
// Two distinct severities so a test can seed both and resolve only the
// higher-severity one to exercise the banner's next-highest-severity
// fallback branch.
export function buildActiveIncidentPayload(overrides = {}) {
  return {
    title: 'Primary API returning 500s',
    severity: 'SEV1',
    affected_components: ['api'],
    summary: 'Elevated 5xx error rate on the primary API gateway',
    ...overrides,
  };
}

export function buildLowerSeverityIncidentPayload(overrides = {}) {
  return {
    title: 'Background job queue delayed',
    severity: 'SEV3',
    affected_components: ['queue'],
    summary: 'Non-critical background jobs processing slower than normal',
    ...overrides,
  };
}
