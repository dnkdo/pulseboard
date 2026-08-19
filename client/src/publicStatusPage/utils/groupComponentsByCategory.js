// Re-exports the canonical PLB-103 grouping utility. The public status
// page's components/utils actually live under ../../utils and
// ../../components (shared with the rest of the public status page render
// tree, see ComponentHealthGrid.jsx); this path mirrors that module under
// publicStatusPage/ so callers that expect it at this location resolve to
// the same implementation rather than a forked copy.
export { groupComponentsByCategory, UNCATEGORIZED, default } from '../../utils/groupComponentsByCategory.js';
