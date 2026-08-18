// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { Chip } from '../../../src/components/dashboard/Chip.jsx';
import { STATE_INVESTIGATING, STATE_RESOLVED, darkTheme } from '../../../src/theme/tokens.js';

afterEach(cleanup);

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

describe('Chip', () => {
  it('renders the mapped label and token color for the incident state returned by the status hook', async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ id: 'inc-1', status: 'investigating' }));

    render(<Chip incidentId="inc-1" fetchImpl={fetchImpl} />);

    const chip = await screen.findByTestId('state-chip');
    expect(chip.textContent).toBe('Investigating');
    expect(chip.dataset.state).toBe('investigating');
    expect(chip.style.backgroundColor).toBe(hexToRgb(STATE_INVESTIGATING));
  });

  it('shows a neutral empty-state chip and never polls when no incidentId is given', () => {
    const fetchImpl = vi.fn(() => jsonResponse({ id: 'inc-1', status: 'open' }));
    render(<Chip fetchImpl={fetchImpl} />);
    expect(screen.getByTestId('state-chip-empty')).toBeTruthy();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('styles the neutral empty-state chip from the shared darkTheme tokens (AC: chip colors sourced from token file)', () => {
    const fetchImpl = vi.fn(() => jsonResponse({ id: 'inc-1', status: 'open' }));
    render(<Chip fetchImpl={fetchImpl} />);
    const chip = screen.getByTestId('state-chip-empty');
    expect(chip.style.backgroundColor).toBe(hexToRgb(darkTheme.surfaceRaised));
    expect(chip.style.color).toBe(hexToRgb(darkTheme.textMuted));
  });

  it('styles an active state chip with white text sourced from darkTheme.textOnColor', async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ id: 'inc-1', status: 'investigating' }));
    render(<Chip incidentId="inc-1" fetchImpl={fetchImpl} />);
    const chip = await screen.findByTestId('state-chip');
    expect(chip.style.color).toBe(hexToRgb(darkTheme.textOnColor));
  });

  it('shows a neutral loading chip before the first fetch resolves', () => {
    const fetchImpl = vi.fn(() => new Promise(() => {})); // never resolves
    render(<Chip incidentId="inc-1" fetchImpl={fetchImpl} />);
    expect(screen.getByTestId('state-chip-loading')).toBeTruthy();
  });

  it('shows a neutral error chip when the fetch fails and no status has ever loaded', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
    render(<Chip incidentId="inc-1" fetchImpl={fetchImpl} />);
    await waitFor(() => expect(screen.getByTestId('state-chip-error')).toBeTruthy());
  });

  describe('re-renders on PATCH-driven status change (AC3: immediate update, no reload)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('updates the rendered chip after the next poll picks up a PATCHed status, without unmounting', async () => {
      let currentStatus = 'investigating';
      const fetchImpl = vi.fn(() => jsonResponse({ id: 'inc-1', status: currentStatus }));

      render(<Chip incidentId="inc-1" pollIntervalMs={3000} fetchImpl={fetchImpl} />);

      await vi.waitFor(() => expect(screen.getByTestId('state-chip').textContent).toBe('Investigating'));
      const chipBeforePatch = screen.getByTestId('state-chip');

      // Simulate a PATCH /api/incidents/inc-1 that flips the DB's status field.
      currentStatus = 'resolved';

      await vi.advanceTimersByTimeAsync(3000);

      await vi.waitFor(() => expect(screen.getByTestId('state-chip').textContent).toBe('Resolved'));
      const chipAfterPatch = screen.getByTestId('state-chip');

      expect(chipAfterPatch.dataset.state).toBe('resolved');
      expect(chipAfterPatch.style.backgroundColor).toBe(hexToRgb(STATE_RESOLVED));
      // Same DOM node re-rendered in place, not a fresh mount/unmount cycle.
      expect(chipAfterPatch).toBe(chipBeforePatch);
      expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('does not update the chip before the poll interval elapses', async () => {
      let currentStatus = 'open';
      const fetchImpl = vi.fn(() => jsonResponse({ id: 'inc-1', status: currentStatus }));

      render(<Chip incidentId="inc-1" pollIntervalMs={5000} fetchImpl={fetchImpl} />);
      await vi.waitFor(() => expect(screen.getByTestId('state-chip').textContent).toBe('Open'));

      currentStatus = 'resolved';
      await vi.advanceTimersByTimeAsync(1000);

      expect(screen.getByTestId('state-chip').textContent).toBe('Open');
    });
  });
});
