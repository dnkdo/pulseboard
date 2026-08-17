// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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

    render(<StatusPage />);

    expect(screen.getByRole('heading', { name: 'Component Status' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('API')).toBeInTheDocument());
  });

  it('wires the active incidents list in and renders a card for each active incident', async () => {
    fetchComponents.mockResolvedValue([]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'API Down', status: 'open', severity: 'SEV1', timestamp: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'Old Outage', status: 'resolved', severity: 'SEV2', timestamp: '2026-01-02T00:00:00Z' },
    ]);

    render(<StatusPage />);

    expect(screen.getByRole('heading', { name: 'Active Incidents' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('API Down')).toBeInTheDocument());
    expect(screen.queryByText('Old Outage')).not.toBeInTheDocument();
  });
});
