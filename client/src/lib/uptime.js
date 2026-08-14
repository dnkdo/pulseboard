// Client-local mirror of the root src/lib/uptime.js formatter — that root module's
// path is pinned by .adlc/testcases.yaml and can't be relocated, so the client
// workspace (which can't reach across workspace boundaries at build time) keeps
// its own copy of this pure one-line formatter rather than importing it.
export function formatUptimePercentage(ratio) {
  return `${(ratio * 100).toFixed(2)}%`;
}
