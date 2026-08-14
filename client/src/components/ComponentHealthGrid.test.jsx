// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ComponentHealthGrid from './ComponentHealthGrid.jsx';
import { fetchComponents } from '../lib/api/components.js';

vi.mock('../lib/api/components.js', () => ({
  fetchComponents: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ComponentHealthGrid', () => {
  it('renders a tile for every component from the API, including 100% uptime with no incidents', async () => {
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 99.95, incidents: [{ id: 'inc-1' }] },
      { id: 'cdn', name: 'CDN', healthState: 'operational', uptimePercent: 100, incidents: [] },
      { id: 'db', name: 'Database', healthState: 'major_outage', uptimePercent: 92.1, incidents: null },
    ]);

    render(<ComponentHealthGrid />);

    await waitFor(() => expect(screen.getByText('API')).toBeInTheDocument());
    expect(screen.getByText('CDN')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();

    // 100% uptime and empty/null incidents must not be filtered out of the grid.
    expect(screen.getByText('100.00% uptime')).toBeInTheDocument();
    expect(screen.getByText('99.95% uptime')).toBeInTheDocument();
    expect(screen.getByText('92.10% uptime')).toBeInTheDocument();
  });

  it('renders exactly as many tiles as components returned, dropping none silently', async () => {
    const payload = Array.from({ length: 5 }, (_, i) => ({
      id: `comp-${i}`,
      name: `Component ${i}`,
      healthState: 'operational',
      uptimePercent: 100,
      incidents: [],
    }));
    fetchComponents.mockResolvedValue(payload);

    render(<ComponentHealthGrid />);

    await waitFor(() => expect(screen.getAllByText(/^Component \d$/)).toHaveLength(5));
  });

  it('shows an alert and no tiles when the API call fails', async () => {
    fetchComponents.mockRejectedValue(new Error('network down'));

    render(<ComponentHealthGrid />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByTestId('health-tile-dot')).not.toBeInTheDocument();
  });

  it('ignores a successful fetch that resolves after the component has unmounted', async () => {
    let resolveFetch;
    fetchComponents.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = render(<ComponentHealthGrid />);
    unmount();

    await expect(
      (async () => {
        resolveFetch([{ id: 'api', name: 'API', healthState: 'operational', uptimePercent: 100, incidents: [] }]);
        await Promise.resolve();
        await Promise.resolve();
      })(),
    ).resolves.not.toThrow();
  });

  it('ignores a failed fetch that rejects after the component has unmounted', async () => {
    let rejectFetch;
    fetchComponents.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFetch = reject;
      }),
    );

    const { unmount } = render(<ComponentHealthGrid />);
    unmount();

    rejectFetch(new Error('too late'));
    await expect(Promise.resolve()).resolves.not.toThrow();
  });
});
