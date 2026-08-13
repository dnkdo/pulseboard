// Pure uptime calculation — performs no wall-clock reads of any kind.
// All temporal inputs arrive as explicit millisecond durations from the caller.

// totalPeriodMs === 0 has no meaningful ratio; return 0 rather than NaN/Infinity
// so callers get a defined number instead of having to special-case the result.
export function calculateUptime(downtimeMs, totalPeriodMs) {
  if (totalPeriodMs === 0) {
    return 0;
  }

  return ((totalPeriodMs - downtimeMs) / totalPeriodMs) * 100;
}
