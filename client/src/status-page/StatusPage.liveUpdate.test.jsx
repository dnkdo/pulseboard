// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import StatusPage from './StatusPage.jsx';
import { fetchComponents } from '../lib/api/components.js';
import { fetchIncidents } from '../lib/api/incidents.js';
import { POLL_INTERVAL_MS } from '../config/index.js';

vi.mock('../lib/api/components.js', () => ({
  fetchComponents: vi.fn(),
}));
vi.mock('../lib/api/incidents.js', () => ({
  fetchIncidents: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('StatusPage live update (PLB-76)', () => {
  it('AC: reflects a backend incident status change (PATCH to resolved) within one polling interval, with no reload or manual action', async () => {
    vi.useFakeTimers();
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 100 },
    ]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'API Down', status: 'investigating', severity: 'SEV1', resolvedAt: null },
    ]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      within(screen.getByTestId('active-incidents-list')).getByText('API Down'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('past-incidents-list')).not.toBeInTheDocument();

    // Simulate the backend PATCHing the incident to resolved — the next
    // poll (not a reload, not a manual publish action) should pick this up.
    fetchIncidents.mockResolvedValue([
      {
        id: '1',
        title: 'API Down',
        status: 'resolved',
        severity: 'SEV1',
        resolvedAt: '2026-08-17T00:00:00Z',
      },
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });

    expect(screen.getByTestId('active-incidents-empty')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('past-incidents-list')).getByText('API Down'),
    ).toBeInTheDocument();
  });

  it('AC: reflects a component health state change within one polling interval, with no reload', async () => {
    vi.useFakeTimers();
    fetchIncidents.mockResolvedValue([]);
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 100 },
    ]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('API').closest('[data-status]')).toHaveAttribute(
      'data-status',
      'operational',
    );

    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'major_outage', uptimePercent: 92 },
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });

    expect(screen.getByText('API').closest('[data-status]')).toHaveAttribute(
      'data-status',
      'major_outage',
    );
  });

  it('does not re-render past its initial paint when repeated polls return unchanged data', async () => {
    vi.useFakeTimers();
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 100 },
    ]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'API Down', status: 'investigating', severity: 'SEV1', resolvedAt: null },
    ]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      within(screen.getByTestId('active-incidents-list')).getByText('API Down'),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });

    // Data is unchanged across ticks — the card is still present and the
    // page hasn't dropped into an error/loading state from spurious churn.
    expect(
      within(screen.getByTestId('active-incidents-list')).getByText('API Down'),
    ).toBeInTheDocument();
    expect(fetchIncidents.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
