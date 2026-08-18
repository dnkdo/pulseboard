import { useIncidentFilter } from '../../state/IncidentFilterContext.jsx';
import { getStateChipProps } from './stateChips.js';
import { chipStyle } from './Chip.styles.js';
import { IncidentStateTransition } from '../IncidentStateTransition.jsx';
import {
  incidentListContainerStyle,
  incidentListHeaderStyle,
  incidentListRowStyle,
  incidentListRowTitleStyle,
  incidentListEmptyStyle,
} from './IncidentList.styles.js';

// Renders the internal dashboard's incident list, reading `filteredIncidents`
// from IncidentFilterContext (see src/state/IncidentFilterContext.jsx) rather
// than computing its own filtered view. That's what keeps this list and
// Timeline in sync off a single ComponentFilterControls selection — both
// consume the same derived value from the same provider.
export function IncidentList() {
  const { filteredIncidents } = useIncidentFilter();

  if (filteredIncidents.length === 0) {
    return (
      <div data-testid="incident-list-empty" style={incidentListEmptyStyle}>
        No incidents match the selected component
      </div>
    );
  }

  return (
    <div data-testid="incident-list" style={incidentListContainerStyle}>
      <div style={incidentListHeaderStyle}>Incidents</div>
      {filteredIncidents.map((incident, index) => {
        const state = incident.state ?? incident.status;
        const { label, token } = getStateChipProps(state);
        const componentId = incident.componentId ?? incident.component_id;
        return (
          <div
            key={incident.id ?? index}
            data-testid="incident-list-item"
            data-component-id={componentId}
            style={incidentListRowStyle(index)}
          >
            <div style={incidentListRowTitleStyle}>{incident.title ?? 'Untitled incident'}</div>
            <span data-testid="incident-list-state" style={chipStyle(token)}>
              {label}
            </span>
            <IncidentStateTransition incident={incident} />
          </div>
        );
      })}
    </div>
  );
}

export default IncidentList;
