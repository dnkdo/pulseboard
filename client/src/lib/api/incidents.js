// Thin fetch wrapper for GET /api/incidents, mirroring fetchComponents.js.
// Returns the raw incident records unmodified — filtering/sorting for the
// active-incidents section is the caller's job (src/lib/incidents.js).
export async function fetchIncidents() {
  const response = await fetch('/api/incidents');

  if (!response.ok) {
    throw new Error(`Failed to fetch incidents: ${response.status}`);
  }

  return response.json();
}
