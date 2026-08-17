// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import StatusBanner from './StatusBanner.jsx';
import { fetchIncidents } from '../lib/api/incidents.js';

vi.mock('../lib/api/incidents.js', () => ({
  fetchIncidents: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StatusBanner', () => {
  it('shows "All Systems Operational" when there are no active incidents', async () => {
    fetchIncidents.mockResolvedValue([{ id: '1', status: 'resolved', severity: 'SEV2' }]);

    render(<StatusBanner />);

    await waitFor(() => expect(screen.getByText('All Systems Operational')).toBeInTheDocument());
    expect(screen.getByTestId('status-banner')).toHaveAttribute('data-status', 'operational');
  });

  it('shows the highest-severity active incident label when multiple incidents are active', async () => {
    fetchIncidents.mockResolvedValue([
      { id: '1', status: 'investigating', severity: 'SEV3' },
      { id: '2', status: 'open', severity: 'SEV1' },
      { id: '3', status: 'resolved', severity: 'SEV1' },
    ]);

    render(<StatusBanner />);

    await waitFor(() => expect(screen.getByText('Critical Outage')).toBeInTheDocument());
    expect(screen.getByTestId('status-banner')).toHaveAttribute('data-status', 'SEV1');
  });

  it('renders an "All Systems Operational" banner for an empty incident list', async () => {
    fetchIncidents.mockResolvedValue([]);

    render(<StatusBanner />);

    await waitFor(() => expect(screen.getByText('All Systems Operational')).toBeInTheDocument());
  });

  it('shows an alert and no status label when the API call fails', async () => {
    fetchIncidents.mockRejectedValue(new Error('network down'));

    render(<StatusBanner />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('All Systems Operational')).not.toBeInTheDocument();
  });

  it('shows a loading state before the first fetch resolves', () => {
    fetchIncidents.mockReturnValue(new Promise(() => {}));

    render(<StatusBanner />);

    expect(screen.getByText('Loading status…')).toBeInTheDocument();
  });
});
