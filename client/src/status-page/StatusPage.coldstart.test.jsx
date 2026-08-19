// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import StatusPage from './StatusPage.jsx';
import { fetchComponents } from '../lib/api/components.js';
import { fetchIncidents } from '../lib/api/incidents.js';

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

describe('StatusPage cold start (PLB-76)', () => {
  it('AC: renders seeded incident and component data on first load, without any polling interval elapsing', async () => {
    vi.useFakeTimers();
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 99.95 },
      { id: 'db', name: 'Database', healthState: 'major_outage', uptimePercent: 92.1 },
    ]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'Database Failover', status: 'open', severity: 'SEV1', resolvedAt: null },
      {
        id: '2',
        title: 'Past CDN Blip',
        status: 'resolved',
        severity: 'SEV3',
        resolvedAt: '2026-08-10T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    // Flush only pending microtasks from the immediate mount-time fetch —
    // zero timers advanced — to prove cold start doesn't wait for an
    // interval tick to seed the UI.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchComponents).toHaveBeenCalledTimes(1);
    expect(fetchIncidents).toHaveBeenCalled();

    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('active-incidents-list')).getByText('Database Failover'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('past-incidents-list')).getByText('Past CDN Blip'),
    ).toBeInTheDocument();
  });

  it('shows a loading state, not stale or blank content, before the cold-start fetch resolves', () => {
    fetchComponents.mockReturnValue(new Promise(() => {}));
    fetchIncidents.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading component status…')).toBeInTheDocument();
    expect(screen.getByText('Loading active incidents…')).toBeInTheDocument();
    expect(screen.getByText('Loading past incidents…')).toBeInTheDocument();
  });
});
