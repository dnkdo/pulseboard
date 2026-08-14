// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import StatCardsDashboard from './index.js';

describe('StatCardsDashboard', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
    vi.restoreAllMocks();
    delete global.fetch;
  });

  function textFor(testId) {
    return container.querySelector(`[data-testid="${testId}"]`).textContent;
  }

  it('fetches /api/stats on mount and renders all four stat values', async () => {
    const stats = { openIncidents: 3, mttr7d: 42, incidentsThisMonth: 5, uptimePercentage: 99.9 };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => stats });

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(StatCardsDashboard));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stats');
    expect(textFor('stat-value-openIncidents')).toBe('3');
    expect(textFor('stat-value-mttr7d')).toBe('42');
    expect(textFor('stat-value-incidentsThisMonth')).toBe('5');
    expect(textFor('stat-value-uptimePercentage')).toBe('99.9');
  });

  it('PATCHes the incident then refetches /api/stats on resolve, re-rendering with the fresh values', async () => {
    const before = { openIncidents: 2, mttr7d: 10, incidentsThisMonth: 1, uptimePercentage: 99 };
    const after = { openIncidents: 1, mttr7d: 15, incidentsThisMonth: 1, uptimePercentage: 99.5 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => before })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'inc-1', state: 'resolved' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => after });
    global.fetch = fetchMock;

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(StatCardsDashboard, { incidentId: 'inc-1' }));
    });

    expect(textFor('stat-value-openIncidents')).toBe('2');

    const button = container.querySelector('[data-testid="resolve-incident-button"]');
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/incidents/inc-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ state: 'resolved' }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/stats');
    expect(textFor('stat-value-openIncidents')).toBe('1');
  });

  it('surfaces a failed fetch as a visible error instead of swallowing it', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(StatCardsDashboard));
    });

    expect(container.querySelector('[data-testid="stat-cards-error"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="stat-cards"]')).toBeNull();
  });
});
