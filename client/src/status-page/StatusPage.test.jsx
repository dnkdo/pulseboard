// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
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
});

describe('StatusPage', () => {
  it('wires the component health grid in and renders its tiles', async () => {
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 100, incidents: [] },
    ]);
    fetchIncidents.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Component Status' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('API')).toBeInTheDocument());
  });

  it('wires the active incidents list in and renders a card for each active incident', async () => {
    fetchComponents.mockResolvedValue([]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'API Down', status: 'open', severity: 'SEV1', timestamp: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'Old Outage', status: 'resolved', severity: 'SEV2', timestamp: '2026-01-02T00:00:00Z' },
    ]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Active Incidents' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('API Down')).toBeInTheDocument());
    expect(within(screen.getByTestId('active-incidents-list')).queryByText('Old Outage')).not.toBeInTheDocument();
  });

  it('AC: wires the past incidents list in, showing only resolved incidents in reverse-chronological order', async () => {
    fetchComponents.mockResolvedValue([]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'API Down', status: 'open', severity: 'SEV1', resolvedAt: null },
      {
        id: '2',
        title: 'Older Resolved Outage',
        status: 'resolved',
        severity: 'SEV2',
        resolvedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: '3',
        title: 'Newer Resolved Outage',
        status: 'resolved',
        severity: 'SEV3',
        resolvedAt: '2026-01-10T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Past Incidents' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('past-incident-row')).toHaveLength(2));

    const rowTitles = screen.getAllByTestId('past-incident-row').map((row) => row.textContent);
    expect(rowTitles[0]).toContain('Newer Resolved Outage');
    expect(rowTitles[1]).toContain('Older Resolved Outage');
    expect(within(screen.getByTestId('past-incidents-list')).queryByText('API Down')).not.toBeInTheDocument();
  });
});
