import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

vi.mock('./lib/api/components.js', () => ({
  fetchComponents: vi.fn().mockResolvedValue([]),
}));

describe('client vitest environment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
    window.history.pushState({}, '', '/');
  });

  it('exposes a real DOM (document/window) because the test environment is jsdom, not node', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(window.HTMLElement);
  });

  it('mounts the App component at "/" and renders the stat cards dashboard, not the public status page', async () => {
    global.fetch = vi.fn((url) => {
      if (url === '/api/stats') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ openIncidents: 1, mttr7d: 2, incidentsThisMonth: 3, uptimePercentage: 99 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Pulseboard');
    expect(global.fetch).toHaveBeenCalledWith('/api/stats');
    expect(container.querySelector('[data-testid="stat-cards"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="stat-value-openIncidents"]').textContent).toBe('1');
    // The internal dashboard route ("/") must not also render the public
    // status page — that lives at its own route, "/status" (PLB-78).
    expect(container.querySelector('[data-testid="status-banner"]')).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('mounts the App component at "/status" and renders the public status page, not the internal dashboard', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => [] }));
    window.history.pushState({}, '', '/status');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Pulseboard');
    expect(container.querySelector('[data-testid="status-banner"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="stat-cards"]')).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('AC4: refreshes stat cards immediately after a real user PATCHes an incident from the incident list, with no page reload', async () => {
    const statsBefore = { openIncidents: 1, mttr7d: 0, incidentsThisMonth: 1, uptimePercentage: 100 };
    const statsAfter = { openIncidents: 0, mttr7d: 5, incidentsThisMonth: 1, uptimePercentage: 100 };
    const incident = { id: 'inc-1', title: 'API latency spike', severity: 'SEV2', state: 'open' };

    let statsCallCount = 0;
    global.fetch = vi.fn((url, options) => {
      if (url === '/api/stats') {
        statsCallCount += 1;
        return Promise.resolve({ ok: true, json: async () => (statsCallCount === 1 ? statsBefore : statsAfter) });
      }
      if (url === '/api/incidents') {
        return Promise.resolve({ ok: true, json: async () => [incident] });
      }
      if (url === '/api/incidents/inc-1' && options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({ ...incident, state: 'investigating' }) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.querySelector('[data-testid="stat-value-openIncidents"]').textContent).toBe('1');
    const advanceButton = container.querySelector('[data-testid="advance-incident-inc-1"]');
    expect(advanceButton).not.toBeNull();

    await act(async () => {
      advanceButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/incidents/inc-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ state: 'investigating' }) })
    );
    expect(statsCallCount).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[data-testid="stat-value-openIncidents"]').textContent).toBe('0');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
