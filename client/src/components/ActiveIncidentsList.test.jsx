// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActiveIncidentsList from './ActiveIncidentsList.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ActiveIncidentsList', () => {
  it('renders nothing but an empty-state message when there are zero active incidents', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([]);
    render(<ActiveIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByTestId('active-incidents-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('incident-card')).not.toBeInTheDocument();
  });

  it('renders exactly one card for a single active incident', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([{ id: '1', title: 'API Down', status: 'open', severity: 'SEV1' }]);
    render(<ActiveIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getAllByTestId('incident-card')).toHaveLength(1));
    expect(screen.getByText('API Down')).toBeInTheDocument();
  });

  it('renders one card per concurrent active incident, ordered by severity descending', async () => {
    const fetchImpl = vi.fn().mockResolvedValue([
      { id: '1', title: 'Minor Blip', status: 'open', severity: 'SEV3' },
      { id: '2', title: 'Total Outage', status: 'open', severity: 'SEV1' },
      { id: '3', title: 'Partial Outage', status: 'open', severity: 'SEV2' },
    ]);
    render(<ActiveIncidentsList fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getAllByTestId('incident-card')).toHaveLength(3));
    const titles = screen.getAllByTestId('incident-card').map((card) => card.textContent);
    expect(titles[0]).toContain('Total Outage');
    expect(titles[1]).toContain('Partial Outage');
    expect(titles[2]).toContain('Minor Blip');
  });

  it('AC: an active incident card disappears automatically on the next poll once resolved, no manual refresh', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce([{ id: '1', title: 'API Down', status: 'open', severity: 'SEV1' }])
      .mockResolvedValueOnce([{ id: '1', title: 'API Down', status: 'resolved', severity: 'SEV1' }]);

    render(<ActiveIncidentsList pollIntervalMs={15000} fetchImpl={fetchImpl} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('API Down')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(screen.queryByText('API Down')).not.toBeInTheDocument();
    expect(screen.getByTestId('active-incidents-empty')).toBeInTheDocument();
  });
});
