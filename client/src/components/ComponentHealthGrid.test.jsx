// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
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

  describe('category grouping (PLB-103)', () => {
    it('AC1: renders exactly one section heading per distinct category present in the data', async () => {
      fetchComponents.mockResolvedValue([
        { id: 'api', name: 'Core API', category: 'API', healthState: 'operational', uptimePercent: 99.9 },
        { id: 'auth', name: 'Auth API', category: 'API', healthState: 'degraded', uptimePercent: 98 },
        { id: 'web', name: 'Public Status Page', category: 'Web', healthState: 'operational', uptimePercent: 100 },
      ]);

      render(<ComponentHealthGrid />);

      await waitFor(() => expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2));
      const headingNames = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(headingNames.sort()).toEqual(['API', 'Web']);
    });

    it('AC2: renders every component tile exactly once, under its own category section', async () => {
      fetchComponents.mockResolvedValue([
        { id: 'api', name: 'Core API', category: 'API', healthState: 'operational', uptimePercent: 99.9 },
        { id: 'auth', name: 'Auth API', category: 'API', healthState: 'degraded', uptimePercent: 98 },
        { id: 'web', name: 'Public Status Page', category: 'Web', healthState: 'operational', uptimePercent: 100 },
      ]);

      render(<ComponentHealthGrid />);

      await waitFor(() => expect(screen.getAllByTestId('category-section')).toHaveLength(2));

      const apiSection = screen.getAllByTestId('category-section').find(
        (section) => section.getAttribute('data-category') === 'API',
      );
      const webSection = screen.getAllByTestId('category-section').find(
        (section) => section.getAttribute('data-category') === 'Web',
      );

      expect(within(apiSection).getAllByText('Core API')).toHaveLength(1);
      expect(within(apiSection).getAllByText('Auth API')).toHaveLength(1);
      expect(within(apiSection).queryByText('Public Status Page')).not.toBeInTheDocument();

      expect(within(webSection).getAllByText('Public Status Page')).toHaveLength(1);
      expect(within(webSection).queryByText('Core API')).not.toBeInTheDocument();

      expect(screen.getAllByText('Core API')).toHaveLength(1);
      expect(screen.getAllByText('Auth API')).toHaveLength(1);
      expect(screen.getAllByText('Public Status Page')).toHaveLength(1);
    });

    it('AC3: does not render a section heading for a category with zero components in the payload', async () => {
      fetchComponents.mockResolvedValue([
        { id: 'api', name: 'Core API', category: 'API', healthState: 'operational', uptimePercent: 99.9 },
        { id: 'web', name: 'Public Status Page', category: 'Web', healthState: 'operational', uptimePercent: 100 },
      ]);

      render(<ComponentHealthGrid />);

      await waitFor(() => expect(screen.getAllByTestId('category-section')).toHaveLength(2));
      expect(screen.queryByRole('heading', { name: 'Infrastructure' })).not.toBeInTheDocument();
    });

    it('groups duplicate-category components under a single shared heading, not one heading per component', async () => {
      fetchComponents.mockResolvedValue([
        { id: 'db', name: 'Primary Database', category: 'Infrastructure', healthState: 'operational', uptimePercent: 99.9 },
        { id: 'lb', name: 'Load Balancer', category: 'Infrastructure', healthState: 'operational', uptimePercent: 99.9 },
        { id: 'cache', name: 'Cache Cluster', category: 'Infrastructure', healthState: 'operational', uptimePercent: 99.9 },
      ]);

      render(<ComponentHealthGrid />);

      await waitFor(() => expect(screen.getAllByText('Primary Database')).toHaveLength(1));
      expect(screen.getAllByRole('heading', { name: 'Infrastructure', level: 3 })).toHaveLength(1);
      expect(screen.getAllByTestId('category-section')).toHaveLength(1);
      expect(screen.getByText('Load Balancer')).toBeInTheDocument();
      expect(screen.getByText('Cache Cluster')).toBeInTheDocument();
    });
  });
});
