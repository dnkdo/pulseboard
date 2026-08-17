// Centralized client-side config so tunables like the status-page poll
// interval live in one place instead of being hardcoded per component.
// Override via VITE_POLL_INTERVAL_MS at build/deploy time (e.g. a shorter
// interval in staging vs. production) without touching source.
const parsedPollIntervalMs = Number(import.meta.env?.VITE_POLL_INTERVAL_MS);

export const POLL_INTERVAL_MS =
  Number.isFinite(parsedPollIntervalMs) && parsedPollIntervalMs > 0 ? parsedPollIntervalMs : 15000;
