// Pure grouping utility for the public status page — no fetch/DOM
// dependencies, operates on any array of component-like objects with a
// `category` field. Keys are ordered by each category's first appearance in
// the input; each array preserves the original relative order of its
// members (push-only, never sorted), so section rendering order matches API
// response order rather than being alphabetically re-sorted.
//
// Components with a missing/null/blank category fall into a single
// 'Uncategorized' bucket rather than being silently dropped — the product
// has no documented convention for excluding uncategorized components from
// the public status page, and dropping them would hide real component
// health data from customers.
export const UNCATEGORIZED = 'Uncategorized';

export function groupComponentsByCategory(components) {
  const result = {};

  for (const component of components) {
    const category = component.category?.trim() ? component.category : UNCATEGORIZED;
    if (!result[category]) {
      result[category] = [];
    }
    result[category].push(component);
  }

  return result;
}

export default groupComponentsByCategory;
