// Display-only formatter: 0-1 ratio -> "NN.NN%" string. Not to be confused
// with src/services/uptime.js#calculateUptime, which derives an uptime
// percentage from downtime/period durations server-side; this module only
// formats an already-computed value for rendering.
// toFixed(2) handles rounding and the 0 / 1 boundaries without special-casing.
export function formatUptimePercentage(ratio) {
  return `${(ratio * 100).toFixed(2)}%`;
}
