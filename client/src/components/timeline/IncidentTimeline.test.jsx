// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

describe('IncidentTimeline', () => {
  it('shows a loading indicator while isLoading is true, before any incidents render', () => {
    render(<IncidentTimeline incidents={[]} isLoading error={null} />);

    expect(screen.getByTestId('incident-timeline-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline')).not.toBeInTheDocument();
  });

  it('shows an error state and no incident entries when error is set', () => {
    render(<IncidentTimeline incidents={[]} isLoading={false} error="boom" />);

    expect(screen.getByTestId('incident-timeline-error')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are zero incidents', () => {
    render(<IncidentTimeline incidents={[]} isLoading={false} error={null} />);

    expect(screen.getByTestId('incident-timeline-empty')).toBeInTheDocument();
  });

  it('renders exactly one entry per incident, in the order given', () => {
    render(
      <IncidentTimeline
        incidents={[
          { id: '1', title: 'API Latency Spike', severity: 'SEV1', createdAt: '2026-08-01' },
          { id: '2', title: 'Minor UI Glitch', severity: 'SEV3', createdAt: '2026-08-05' },
        ]}
        isLoading={false}
        error={null}
      />
    );

    const entries = screen.getAllByTestId(/incident-timeline-entry-/);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveAttribute('data-severity', 'SEV1');
    expect(entries[1]).toHaveAttribute('data-severity', 'SEV3');
    expect(screen.getByText('API Latency Spike')).toBeInTheDocument();
    expect(screen.getByText('Minor UI Glitch')).toBeInTheDocument();
  });

  it('re-renders on the same instance to a narrower list when the incidents prop changes (e.g. a filter narrowing the dataset)', () => {
    const { rerender } = render(<IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />);

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(3);

    const filtered = ALL_INCIDENTS.filter((incident) => incident.severity === 'SEV1');
    rerender(<IncidentTimeline incidents={filtered} isLoading={false} error={null} />);

    const entries = screen.getAllByTestId(/incident-timeline-entry-/);
    expect(entries).toHaveLength(2);
    expect(screen.getByTestId('incident-timeline-entry-1')).toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline-entry-3')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline-entry-2')).not.toBeInTheDocument();
  });

  it('re-renders on the same instance back to the empty state when a filter change narrows incidents to zero matches', () => {
    const { rerender } = render(<IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />);

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(3);

    rerender(<IncidentTimeline incidents={[]} isLoading={false} error={null} />);

    expect(screen.queryByTestId('incident-timeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline-empty')).toBeInTheDocument();
  });

  it('re-renders on the same instance back to the full list when filters are cleared', () => {
    const filtered = ALL_INCIDENTS.filter((incident) => incident.severity === 'SEV1');
    const { rerender } = render(<IncidentTimeline incidents={filtered} isLoading={false} error={null} />);

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(2);

    rerender(<IncidentTimeline incidents={ALL_INCIDENTS} isLoading={false} error={null} />);

    expect(screen.getAllByTestId(/incident-timeline-entry-/)).toHaveLength(3);
  });
});
