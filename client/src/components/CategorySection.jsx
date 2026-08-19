import styles from './CategorySection.module.css';
import HealthTile from './HealthTile.jsx';

// Renders one category's section heading plus its component tile grid.
// Presentational only — callers (ComponentHealthGrid) own fetching/grouping.
// Guards against an empty components array itself (not just via caller-side
// filtering) so a category with zero components never renders a section,
// per AC3.
export default function CategorySection({ category, components }) {
  if (!components || components.length === 0) {
    return null;
  }

  return (
    <div data-testid="category-section" data-category={category}>
      <h3 className={styles.heading}>{category}</h3>
      <div className={styles.grid} data-testid="category-section-grid">
        {components.map((component) => (
          <HealthTile
            key={component.id}
            name={component.name}
            status={component.healthState}
            uptimePercent={component.uptimePercent}
          />
        ))}
      </div>
    </div>
  );
}
