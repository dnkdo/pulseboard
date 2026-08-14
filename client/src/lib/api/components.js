// Thin fetch wrapper for GET /api/components. Callers get back the raw
// component records from the API (id, name, healthState, uptimePercent, ...)
// unmodified — no local uptime recomputation happens here.
export async function fetchComponents() {
  const response = await fetch('/api/components');

  if (!response.ok) {
    throw new Error(`Failed to fetch components: ${response.status}`);
  }

  return response.json();
}
