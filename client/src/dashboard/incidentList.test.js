// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import IncidentList, { INCIDENTS_CHANGED_EVENT } from './incidentList.js';

describe('IncidentList', () => {
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

  it('fetches /api/incidents on mount and renders a row per incident with an advance button for non-terminal states', async () => {
    const incidents = [
      { id: 'inc-1', title: 'API latency spike', state: 'open' },
      { id: 'inc-2', title: 'DB pool exhausted', state: 'resolved' },
    ];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => incidents });

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(IncidentList));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/incidents');
    expect(textFor('incident-row-inc-1')).toContain('open');
    expect(container.querySelector('[data-testid="advance-incident-inc-1"]')).not.toBeNull();
    expect(textFor('incident-row-inc-2')).toContain('resolved');
    expect(container.querySelector('[data-testid="advance-incident-inc-2"]')).toBeNull();
  });

  it('PATCHes to the next sequential state, refetches the list, and dispatches the shared refresh event', async () => {
    const before = [{ id: 'inc-1', title: 'API latency spike', state: 'open' }];
    const after = [{ id: 'inc-1', title: 'API latency spike', state: 'investigating' }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => before })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'inc-1', state: 'investigating' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => after });
    global.fetch = fetchMock;

    const eventListener = vi.fn();
    window.addEventListener(INCIDENTS_CHANGED_EVENT, eventListener);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(IncidentList));
    });

    const button = container.querySelector('[data-testid="advance-incident-inc-1"]');
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/incidents/inc-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ state: 'investigating' }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/incidents');
    expect(textFor('incident-row-inc-1')).toContain('investigating');
    expect(eventListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(INCIDENTS_CHANGED_EVENT, eventListener);
  });

  it('surfaces a failed fetch as a visible error instead of swallowing it', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(IncidentList));
    });

    expect(container.querySelector('[data-testid="incident-list-error"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="incident-list"]')).toBeNull();
  });

  it('does not render an advance button for a resolved (terminal-state) incident', async () => {
    const incidents = [{ id: 'inc-1', title: 'Resolved incident', state: 'resolved' }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => incidents });

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(IncidentList));
    });

    expect(container.querySelector('[data-testid="advance-incident-inc-1"]')).toBeNull();
  });
});
