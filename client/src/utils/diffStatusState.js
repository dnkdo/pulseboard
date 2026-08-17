// Structural diff for polling snapshots (arrays of incidents/components, or
// plain objects). Array snapshots are normalized by `id` before comparing so
// re-ordering alone never counts as a change, while any field-level
// difference (e.g. an incident's status flipping to 'resolved', a
// component's healthState changing) is detected as a real change.
function normalize(value) {
  if (Array.isArray(value)) {
    return [...value]
      .map((item) => (item && typeof item === 'object' && 'id' in item ? item : { __item: item }))
      .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
  }
  return value;
}

export function hasStatusStateChanged(prev, next) {
  if (prev === next) {
    return false;
  }
  if (prev == null || next == null) {
    return prev !== next;
  }
  return JSON.stringify(normalize(prev)) !== JSON.stringify(normalize(next));
}

export default hasStatusStateChanged;
