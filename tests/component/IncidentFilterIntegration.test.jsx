// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { IncidentFilterProvider } from '../../src/state/IncidentFilterContext.jsx';
import { ComponentFilterControls } from '../../src/components/dashboard/ComponentFilterControls.jsx';
import { IncidentList } from '../../src/components/dashboard/IncidentList.jsx';
import { Timeline } from '../../src/components/dashboard/Timeline.jsx';

afterEach(cleanup);

const COMPONENTS = [
  { id: 'comp-api', name: 'Core API' },
  { id: 'comp-web', name: 'Public Status Page' },
];

const INCIDENTS = [
  {
    id: 'inc-1',
    title: 'Elevated API latency',
    severity: 'SEV1',
    state: 'open',
    componentId: 'comp-api',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'inc-2',
    title: 'Status banner stale',
    severity: 'SEV3',
    state: 'identified',
    componentId: 'comp-web',
    created_at: '2026-08-02T10:00:00Z',
  },
  {
    id: 'inc-3',
    title: 'Intermittent API 500s',
    severity: 'SEV2',
    state: 'investigating',
    componentId: 'comp-api',
    created_at: '2026-08-03T10:00:00Z',
  },
];

function renderDashboard() {
  return render(
    <IncidentFilterProvider incidents={INCIDENTS} components={COMPONENTS}>
      <ComponentFilterControls />
      <IncidentList />
      <Timeline />
    </IncidentFilterProvider>
  );
}

describe('component filter shared state (IncidentList + Timeline)', () => {
  it('renders the full unfiltered incident set in both views by default ("all")', () => {
    renderDashboard();

    expect(screen.getAllByTestId('incident-list-item')).toHaveLength(3);
    expect(screen.getAllByTestId('timeline-entry')).toHaveLength(3);
  });

  it('selecting a component filters both the incident list and the timeline in the same interaction', () => {
    renderDashboard();

    fireEvent.click(screen.getByTestId('component-filter-option-comp-api'));

    const listItems = screen.getAllByTestId('incident-list-item');
    expect(listItems).toHaveLength(2);
    expect(listItems.every((item) => item.dataset.componentId === 'comp-api')).toBe(true);
    expect(within(screen.getByTestId('incident-list')).queryByText('Status banner stale')).toBeNull();

    const timelineEntries = screen.getAllByTestId('timeline-entry');
    expect(timelineEntries).toHaveLength(2);
    expect(screen.queryByText('Status banner stale')).toBeNull();
  });

  it("switching back to 'all' restores the full incident set in both views", () => {
    renderDashboard();

    fireEvent.click(screen.getByTestId('component-filter-option-comp-web'));
    expect(screen.getAllByTestId('incident-list-item')).toHaveLength(1);
    expect(screen.getAllByTestId('timeline-entry')).toHaveLength(1);

    fireEvent.click(screen.getByTestId('component-filter-option-all'));

    expect(screen.getAllByTestId('incident-list-item')).toHaveLength(3);
    expect(screen.getAllByTestId('timeline-entry')).toHaveLength(3);
  });

  it('marks the active filter button via aria-pressed and moves it on selection', () => {
    renderDashboard();

    const allButton = screen.getByTestId('component-filter-option-all');
    const apiButton = screen.getByTestId('component-filter-option-comp-api');

    expect(allButton.getAttribute('aria-pressed')).toBe('true');
    expect(apiButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(apiButton);

    expect(allButton.getAttribute('aria-pressed')).toBe('false');
    expect(apiButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('filtering to a component with no incidents shows the empty state in the list and no timeline entries', () => {
    render(
      <IncidentFilterProvider
        incidents={INCIDENTS}
        components={[...COMPONENTS, { id: 'comp-db', name: 'Primary Database' }]}
      >
        <ComponentFilterControls />
        <IncidentList />
        <Timeline />
      </IncidentFilterProvider>
    );

    fireEvent.click(screen.getByTestId('component-filter-option-comp-db'));

    expect(screen.getByTestId('incident-list-empty')).toBeTruthy();
    expect(screen.queryAllByTestId('incident-list-item')).toHaveLength(0);
    expect(screen.getByTestId('timeline-empty')).toBeTruthy();
    expect(screen.queryAllByTestId('timeline-entry')).toHaveLength(0);
  });
});
