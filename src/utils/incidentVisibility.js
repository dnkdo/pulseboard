// Filters a full incident object down to the fields safe to expose on public routes/views.
// Internal-only fields (internalNotes, assignee, ...) are excluded by construction: the
// whitelist below is exhaustive, so any future field added to the incident schema is
// omitted by default unless explicitly added here.
export function filterPublicIncidentFields(incident) {
  // Callers (REST handlers, React detail views) may not have an incident yet (e.g. still
  // loading); passing null/undefined through avoids forcing every call site to guard first.
  if (incident == null) {
    return incident;
  }

  const { id, title, status, severity, affectedComponents, transitions, publicUpdate } = incident;

  return { id, title, status, severity, affectedComponents, transitions, publicUpdate };
}
