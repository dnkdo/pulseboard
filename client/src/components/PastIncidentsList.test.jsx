// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PastIncidentsList from './PastIncidentsList.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PastIncidentsList', () => {
  it('renders an empty-state message when there are zero resolved incidents', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      { id: '1', title: 'Ongoing Outage', status: 'open', severity: 'SEV1', resolvedAt: null },
    ]);
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByTestId('past-incidents-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('past-incident-row')).not.toBeInTheDocument();
  });

  it('AC: excludes unresolved incidents — only resolved incidents appear', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      { id: '1', title: 'API Down', status: 'open', severity: 'SEV1', resolvedAt: null },
      { id: '2', title: 'Database Lag', status: 'resolved', severity: 'SEV2', resolvedAt: '2026-08-10T00:00:00Z' },
      { id: '3', title: 'Still Investigating', status: 'investigating', severity: 'SEV3', resolvedAt: null },
    ]);
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getAllByTestId('past-incident-row')).toHaveLength(1));
    expect(screen.getByText('Database Lag')).toBeInTheDocument();
    expect(screen.queryByText('API Down')).not.toBeInTheDocument();
    expect(screen.queryByText('Still Investigating')).not.toBeInTheDocument();
  });

  it('AC: renders resolved incidents in reverse-chronological order (most recently resolved first)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      { id: '1', title: 'Oldest Resolved', status: 'resolved', severity: 'SEV3', resolvedAt: '2026-08-01T00:00:00Z' },
      { id: '2', title: 'Newest Resolved', status: 'resolved', severity: 'SEV1', resolvedAt: '2026-08-15T00:00:00Z' },
      { id: '3', title: 'Middle Resolved', status: 'resolved', severity: 'SEV2', resolvedAt: '2026-08-08T00:00:00Z' },
    ]);
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getAllByTestId('past-incident-row')).toHaveLength(3));
    const titles = screen.getAllByTestId('past-incident-row').map((row) => row.textContent);
    expect(titles[0]).toContain('Newest Resolved');
    expect(titles[1]).toContain('Middle Resolved');
    expect(titles[2]).toContain('Oldest Resolved');
  });

  it('renders the affected component and a formatted resolved date for each row', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      {
        id: '1',
        title: 'Database Failover',
        status: 'resolved',
        severity: 'SEV1',
        resolvedAt: '2026-08-10T12:00:00Z',
        affectedComponents: ['Database'],
      },
    ]);
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByText('Database Failover')).toBeInTheDocument());
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-08-10T12:00:00Z').toLocaleString())).toBeInTheDocument();
  });

  it('renders "Unknown" for a missing or malformed resolvedAt instead of an invalid date string', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      { id: '1', title: 'No Resolved Date', status: 'resolved', severity: 'SEV1', resolvedAt: null },
      { id: '2', title: 'Bad Resolved Date', status: 'resolved', severity: 'SEV1', resolvedAt: 'not-a-date' },
    ]);
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getAllByTestId('past-incident-row')).toHaveLength(2));
    expect(screen.getAllByText('Unknown')).toHaveLength(2);
  });

  it('renders a placeholder dash when affectedComponents is an empty array', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      {
        id: '1',
        title: 'Unattributed Incident',
        status: 'resolved',
        severity: 'SEV2',
        resolvedAt: '2026-08-01T00:00:00Z',
        affectedComponents: [],
      },
    ]);
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByText('Unattributed Incident')).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows an error message and no rows when the fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    render(<PastIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByTestId('past-incident-row')).not.toBeInTheDocument();
  });
});
