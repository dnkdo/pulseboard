import { useEffect, useState } from 'react';
import {
  statCardsRowStyle,
  statCardStyle,
  statCardLabelStyle,
  statCardValueStyle,
  statCardsEmptyStyle,
} from './StatCards.styles.js';

const STAT_FIELDS = [
  { key: 'openIncidents', label: 'Open Incidents' },
  { key: 'mttr7d', label: '7-Day MTTR (min)' },
  { key: 'incidentsThisMonth', label: 'Incidents This Month' },
  { key: 'uptimePercentage', label: 'Uptime %' },
];

// Renders the dashboard's stat cards row (computeStatCards' shape from
// src/lib/stats.js), styled per DESIGN.md's Cards + "Stat cards row" rules.
//
// When `stats` is passed, the component is purely presentational (easy to
// unit test). When no `stats` prop is given, it falls back to polling
// GET /api/stats itself — same injectable-fetchImpl / explicit
// loading-error-state shape as Timeline.jsx and Chip.jsx, so real dashboard
// usage doesn't need a separate data layer wired up first.
export function StatCards({ stats, fetchImpl = fetch }) {
  const controlled = stats !== undefined;
  const [state, setState] = useState({
    data: controlled ? stats : null,
    loading: !controlled,
    error: null,
  });

  useEffect(() => {
    if (controlled) {
      setState({ data: stats, loading: false, error: null });
      return undefined;
    }

    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetchImpl('/api/stats');
        if (!response.ok) {
          throw new Error(`StatCards: failed to fetch stats (status ${response.status})`);
        }
        const body = await response.json();
        if (!cancelled) {
          setState({ data: body, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error }));
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, stats, fetchImpl]);

  if (state.loading) {
    return (
      <div data-testid="stat-cards-loading" style={statCardsEmptyStyle}>
        Loading stats…
      </div>
    );
  }

  if (state.error) {
    return (
      <div data-testid="stat-cards-error" style={statCardsEmptyStyle}>
        Unable to load stats
      </div>
    );
  }

  return (
    <div data-testid="stat-cards" style={statCardsRowStyle}>
      {STAT_FIELDS.map((field) => (
        <div key={field.key} data-testid={`stat-card-${field.key}`} style={statCardStyle}>
          <span style={statCardLabelStyle}>{field.label}</span>
          <span data-testid={`stat-value-${field.key}`} style={statCardValueStyle}>
            {String(state.data?.[field.key])}
          </span>
        </div>
      ))}
    </div>
  );
}

export default StatCards;
