// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { IncidentFilterProvider, useIncidentFilter } from '../../src/state/IncidentFilterContext.jsx';

afterEach(cleanup);

const INCIDENTS = [
  { id: '1', componentId: 'comp-a' },
  { id: '2', componentId: 'comp-b' },
];

function Probe() {
  const { selectedComponentId, filteredIncidents, setSelectedComponentId } = useIncidentFilter();
  return (
    <div>
      <div data-testid="selected">{selectedComponentId}</div>
      <div data-testid="count">{filteredIncidents.length}</div>
      <button type="button" onClick={() => setSelectedComponentId('comp-b')}>
        select-b
      </button>
    </div>
  );
}

function ThrowsOutsideProvider() {
  useIncidentFilter();
  return null;
}

describe('IncidentFilterContext', () => {
  it('defaults selectedComponentId to "all" and exposes the full incident list', () => {
    render(
      <IncidentFilterProvider incidents={INCIDENTS}>
        <Probe />
      </IncidentFilterProvider>
    );

    expect(screen.getByTestId('selected').textContent).toBe('all');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('recomputes filteredIncidents when setSelectedComponentId is called', () => {
    render(
      <IncidentFilterProvider incidents={INCIDENTS}>
        <Probe />
      </IncidentFilterProvider>
    );

    fireEvent.click(screen.getByText('select-b'));

    expect(screen.getByTestId('selected').textContent).toBe('comp-b');
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('respects an initialComponentId other than "all"', () => {
    render(
      <IncidentFilterProvider incidents={INCIDENTS} initialComponentId="comp-a">
        <Probe />
      </IncidentFilterProvider>
    );

    expect(screen.getByTestId('selected').textContent).toBe('comp-a');
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('useIncidentFilter throws when used outside an IncidentFilterProvider', () => {
    expect(() => render(<ThrowsOutsideProvider />)).toThrow(
      'useIncidentFilter must be used within an IncidentFilterProvider'
    );
  });
});
