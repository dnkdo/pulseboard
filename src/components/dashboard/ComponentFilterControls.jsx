import { useIncidentFilter } from '../../state/IncidentFilterContext.jsx';
import { filterControlsContainerStyle, filterButtonStyle } from './ComponentFilterControls.styles.js';

// Component filter selector for the internal dashboard. Dispatches through
// IncidentFilterContext's setSelectedComponentId (see
// src/state/IncidentFilterContext.jsx) — no local component-level filter
// state — so a single click updates IncidentList and Timeline together,
// since both derive filteredIncidents from that same shared state.
export function ComponentFilterControls() {
  const { components, selectedComponentId, setSelectedComponentId } = useIncidentFilter();

  return (
    <div data-testid="component-filter-controls" style={filterControlsContainerStyle}>
      <button
        type="button"
        data-testid="component-filter-option-all"
        aria-pressed={selectedComponentId === 'all'}
        style={filterButtonStyle(selectedComponentId === 'all')}
        onClick={() => setSelectedComponentId('all')}
      >
        All
      </button>
      {components.map((component) => (
        <button
          key={component.id}
          type="button"
          data-testid={`component-filter-option-${component.id}`}
          aria-pressed={selectedComponentId === component.id}
          style={filterButtonStyle(selectedComponentId === component.id)}
          onClick={() => setSelectedComponentId(component.id)}
        >
          {component.name ?? component.id}
        </button>
      ))}
    </div>
  );
}

export default ComponentFilterControls;
