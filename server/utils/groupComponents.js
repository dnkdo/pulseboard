// Pure grouping utility — no IO/DB dependencies, operates on any array of
// component-like objects with a `category` field. Keys are ordered by each
// category's first appearance in the input; each array preserves the
// original relative order of its members (push-only, never sorted).
export function groupComponentsByCategory(components) {
  const result = {};

  for (const component of components) {
    const { category } = component;
    if (!result[category]) {
      result[category] = [];
    }
    result[category].push(component);
  }

  return result;
}

export default groupComponentsByCategory;
