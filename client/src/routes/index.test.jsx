// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import AppRoutes from './index.jsx';
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

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes "/status" — public status page', () => {
  it('AC: renders banner, component tiles, active incidents, and past incidents in that fixed order, with non-empty content in each', async () => {
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'Core API', healthState: 'operational', uptimePercent: 99.98 },
    ]);
    fetchIncidents.mockResolvedValue([
      { id: '1', title: 'Elevated latency', status: 'open', severity: 'SEV1', resolvedAt: null },
      { id: '2', title: 'Old outage', status: 'resolved', severity: 'SEV2', resolvedAt: '2026-08-01T00:00:00Z' },
    ]);

    const { container } = renderAt('/status');

    await waitFor(() => expect(screen.getByTestId('status-banner')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('component-health-grid')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('active-incidents-list')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('past-incidents-list')).toBeInTheDocument());

    const sections = ['status-banner', 'component-health-grid', 'active-incidents-list', 'past-incidents-list'].map(
      (testid) => screen.getByTestId(testid),
    );
    // Each section must appear strictly after the previous one in document
    // order (DESIGN.md layout pattern: banner -> tiles -> active -> past).
    for (let i = 1; i < sections.length; i += 1) {
      // bitmask 2 = DOCUMENT_POSITION_FOLLOWING: sections[i] comes after sections[i - 1]
      // eslint-disable-next-line no-bitwise
      expect(sections[i - 1].compareDocumentPosition(sections[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    expect(screen.queryByText('All Systems Operational')).not.toBeInTheDocument(); // SEV1 is active, not operational
    expect(screen.getByText('Core API')).toBeInTheDocument();
    expect(screen.getByText('Elevated latency')).toBeInTheDocument();
    expect(screen.getByText('Old outage')).toBeInTheDocument();
    expect(container.textContent.length).toBeGreaterThan(0);
  });

  it('AC: is reachable with zero auth cookies/headers and does not redirect to a login page or show a 401/403', async () => {
    expect(document.cookie).toBe('');
    fetchComponents.mockResolvedValue([]);
    fetchIncidents.mockResolvedValue([]);

    renderAt('/status');

    await waitFor(() => expect(screen.getByTestId('status-banner')).toBeInTheDocument());
    expect(screen.queryByText(/log in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unauthorized/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/forbidden/i)).not.toBeInTheDocument();
  });

  it('renders empty-state sections (not a crash, not an omitted section) on a fresh dataset with zero incidents', async () => {
    fetchComponents.mockResolvedValue([{ id: 'api', name: 'Core API', healthState: 'operational', uptimePercent: 100 }]);
    fetchIncidents.mockResolvedValue([]);

    renderAt('/status');

    await waitFor(() => expect(screen.getByText('All Systems Operational')).toBeInTheDocument());
    expect(screen.getByTestId('active-incidents-empty')).toBeInTheDocument();
    expect(screen.getByTestId('past-incidents-empty')).toBeInTheDocument();
  });
});

describe('AppRoutes "/" — internal dashboard', () => {
  it('renders the dashboard, not the public status page sections', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => [] }));

    renderAt('/');

    await waitFor(() => expect(screen.getByTestId('stat-cards')).toBeInTheDocument());
    expect(screen.queryByTestId('status-banner')).not.toBeInTheDocument();

    delete global.fetch;
  });
});
