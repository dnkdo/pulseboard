// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { StatCards } from '../../../src/components/dashboard/StatCards.jsx';
import { darkTheme } from '../../../src/theme/tokens.js';

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

const STATS = { openIncidents: 3, mttr7d: 42, incidentsThisMonth: 5, uptimePercentage: 99.9 };

describe('StatCards', () => {
  it('renders all four stat values from the given stats prop', () => {
    render(<StatCards stats={STATS} />);
    expect(screen.getByTestId('stat-value-openIncidents').textContent).toBe('3');
    expect(screen.getByTestId('stat-value-mttr7d').textContent).toBe('42');
    expect(screen.getByTestId('stat-value-incidentsThisMonth').textContent).toBe('5');
    expect(screen.getByTestId('stat-value-uptimePercentage').textContent).toBe('99.9');
  });

  it('styles each stat card from the shared darkTheme tokens (AC: stat card colors sourced from token file)', () => {
    render(<StatCards stats={STATS} />);
    const card = screen.getByTestId('stat-card-openIncidents');
    expect(card.style.backgroundColor).toBe(hexToRgb(darkTheme.surfaceRaised));
    expect(screen.getByTestId('stat-value-openIncidents').style.color).toBe(hexToRgb(darkTheme.text));
  });

  it('applies the Figma-spec 20px gap between cards for spacing consistency (AC: spacing)', () => {
    render(<StatCards stats={STATS} />);
    const row = screen.getByTestId('stat-cards');
    expect(row.style.gap).toBe('20px');
  });

  it('applies the Figma-spec h4 typography to stat values (AC: typography)', () => {
    render(<StatCards stats={STATS} />);
    const value = screen.getByTestId('stat-value-openIncidents');
    expect(value.style.fontSize).toBe('16px');
    expect(value.style.fontWeight).toBe('600');
    expect(value.style.lineHeight).toBe('24px');
  });

  it('shows a loading state before an unconfigured fetch resolves', () => {
    const fetchImpl = () => new Promise(() => {});
    render(<StatCards fetchImpl={fetchImpl} />);
    expect(screen.getByTestId('stat-cards-loading')).toBeTruthy();
  });

  it('fetches from GET /api/stats and renders results when no stats prop is given', async () => {
    const fetchImpl = () => jsonResponse(STATS);
    render(<StatCards fetchImpl={fetchImpl} />);
    await waitFor(() => expect(screen.getByTestId('stat-value-openIncidents').textContent).toBe('3'));
  });

  it('shows an error state and does not swallow a failed fetch', async () => {
    const fetchImpl = () => Promise.resolve({ ok: false, status: 500 });
    render(<StatCards fetchImpl={fetchImpl} />);
    await waitFor(() => expect(screen.getByTestId('stat-cards-error')).toBeTruthy());
    expect(screen.queryByTestId('stat-cards')).toBeNull();
  });
});
