// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import IncidentTimeline from './IncidentTimeline.jsx';

const ALL_INCIDENTS = [
  { id: '1', title: 'API Latency Spike', severity: 'SEV1', createdAt: '2026-08-01' },
  { id: '2', title: 'Minor UI Glitch', severity: 'SEV3', createdAt: '2026-08-05' },
  { id: '3', title: 'Database Outage', severity: 'SEV1', createdAt: '2026-08-12' },
];

afterEach(() => {
  cleanup();
});

// IncidentTimeline renders <Link>s (react-router-dom), so every render needs
// a Router in the tree, not just the ones exercising navigation.
function renderTimeline(ui) {
  return render(<MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>);
}

// Renders IncidentTimeline behind the real /incidents/:incidentId route so
// clicking/activating an entry can be asserted against the resulting page,
// the same route AppRoutes (client/src/routes/index.jsx) mounts IncidentDetailPage at.
function renderTimelineWithRouting(incidents) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<IncidentTimeline incidents={incidents} isLoading={false} error={null} />}
        />
        <Route path="/incidents/:incidentId" element={<div data-testid="landed-on-detail" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IncidentTimeline', () => {
  it('shows a loading indicator while isLoading is true, before any incidents render', () => {
    renderTimeline(<IncidentTimeline incidents={[]} isLoading error={null} />);

    expect(screen.getByTestId('incident-timeline-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline')).not.toBeInTheDocument();
  });

  it('shows an error state and no incident entries when error is set', () => {
    renderTimeline(<IncidentTimeline incidents={[]} isLoading={false} error="boom" />);

    expect(screen.getByTestId('incident-timeline-error')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are zero incidents', () => {
    renderTimeline(<IncidentTimeline incidents={[]} isLoading={false} error={null} />);

    expect(screen.getByTestId('incident-timeline-empty')).toBeInTheDocument();
  });

  it('renders exactly one entry per incident, in the order given', () => {
    renderTimeline(
      <IncidentTimeline
        incidents={[
          { id: '1', title: 'API Latency Spike', severity: 'SEV1', createdAt: '2026-08-01' },
          { id: '2', title: 'Minor UI Glitch', severity: 'SEV3', createdAt: '2026-08-05' },
        ]}
        isLoading={false}
        error={null}
      />,
    );

    const entries = screen.getAllByTestId(/incident-timeline-entry-/);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveAttribute('data-severity', 'SEV1');
    expect(entries[1]).toHaveAttribute('data-severity', 'SEV3');
    expect(screen.getByText('API Latency Spike')).toBeInTheDocument();
    expect(screen.getByText('Minor UI Glitch')).toBeInTheDocument();
  });

  it('re-renders on the same instance to a narrower list when the incidents prop changes (e.g. a filter narrowing the dataset)', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(3);

    const filtered = ALL_INCIDENTS.filter((incident) => incident.severity === 'SEV1');
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <IncidentTimeline incidents={filtered} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    const entries = screen.getAllByTestId(/incident-timeline-entry-/);
    expect(entries).toHaveLength(2);
    expect(screen.getByTestId('incident-timeline-entry-1')).toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline-entry-3')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline-entry-2')).not.toBeInTheDocument();
  });

  it('re-renders on the same instance back to the empty state when a filter change narrows incidents to zero matches', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(3);

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <IncidentTimeline incidents={[]} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('incident-timeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline-empty')).toBeInTheDocument();
  });

  it('re-renders on the same instance back to the full list when filters are cleared', () => {
    const filtered = ALL_INCIDENTS.filter((incident) => incident.severity === 'SEV1');
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <IncidentTimeline incidents={filtered} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(2);

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(3);
  });

  describe('click navigation to incident detail (PLB-98)', () => {
    it('AC: renders each entry as a link pointing at /incidents/:id for that entry\'s incident', () => {
      renderTimeline(
        <IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />,
      );

      expect(screen.getByRole('link', { name: /API Latency Spike/ })).toHaveAttribute(
        'href',
        '/incidents/1',
      );
      expect(screen.getByRole('link', { name: /Minor UI Glitch/ })).toHaveAttribute(
        'href',
        '/incidents/2',
      );
      expect(screen.getByRole('link', { name: /Database Outage/ })).toHaveAttribute(
        'href',
        '/incidents/3',
      );
    });

    it('AC: clicking a timeline entry navigates to that exact incident\'s detail page', () => {
      renderTimelineWithRouting(ALL_INCIDENTS);

      fireEvent.click(screen.getByRole('link', { name: /Database Outage/ }));

      expect(screen.getByTestId('landed-on-detail')).toBeInTheDocument();
    });

    it('AC: keyboard-focusing an entry and pressing Enter navigates to the same detail page as a click', () => {
      renderTimelineWithRouting(ALL_INCIDENTS);

      const link = screen.getByRole('link', { name: /Minor UI Glitch/ });
      link.focus();
      expect(link).toHaveFocus();

      fireEvent.click(link, { detail: 0 }); // Enter/Space activation of a focused <a> fires a "detail: 0" click natively

      expect(screen.getByTestId('landed-on-detail')).toBeInTheDocument();
    });

    it('does not alter the existing visible content nodes (severity, title, timestamp) when adding the link wrapper', () => {
      renderTimeline(
        <IncidentTimeline
          incidents={[ALL_INCIDENTS[0]]}
          isLoading={false}
          error={null}
        />,
      );

      const entry = screen.getByTestId('incident-timeline-entry-1');
      expect(entry).toHaveAttribute('data-severity', 'SEV1');
      expect(screen.getByTestId('incident-timeline-severity')).toHaveTextContent('SEV1');
      expect(screen.getByTestId('incident-timeline-title')).toHaveTextContent(
        'API Latency Spike',
      );
      expect(screen.getByTestId('incident-timeline-timestamp')).toBeInTheDocument();
    });
  });
});
