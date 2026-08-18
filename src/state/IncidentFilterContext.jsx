import { createContext, useContext, useMemo, useState } from 'react';
import { filterIncidentsByComponent } from '../lib/filters.js';

// Single shared state source for the internal dashboard's component filter.
// IncidentList and Timeline both read `filteredIncidents` from this context
// instead of each computing their own filtered view, so one
// setSelectedComponentId call updates both views in the same render/commit
// rather than requiring two separate filter states to be kept in sync.
export const IncidentFilterContext = createContext(null);

export function IncidentFilterProvider({ incidents = [], components = [], initialComponentId = 'all', children }) {
  const [selectedComponentId, setSelectedComponentId] = useState(initialComponentId);

  const filteredIncidents = useMemo(
    () => filterIncidentsByComponent(incidents, selectedComponentId),
    [incidents, selectedComponentId]
  );

  const value = useMemo(
    () => ({ incidents, components, selectedComponentId, setSelectedComponentId, filteredIncidents }),
    [incidents, components, selectedComponentId, filteredIncidents]
  );

  return <IncidentFilterContext.Provider value={value}>{children}</IncidentFilterContext.Provider>;
}

// Throws outside a provider (rather than returning a silently-empty
// default) so a component that forgets to mount IncidentFilterProvider
// fails loudly in development/tests instead of rendering an always-empty
// incident list.
export function useIncidentFilter() {
  const context = useContext(IncidentFilterContext);
  if (!context) {
    throw new Error('useIncidentFilter must be used within an IncidentFilterProvider');
  }
  return context;
}
