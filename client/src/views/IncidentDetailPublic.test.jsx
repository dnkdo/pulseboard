// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import IncidentDetailPublic from './IncidentDetailPublic.jsx';

afterEach(() => {
  cleanup();
});

describe('IncidentDetailPublic', () => {
  it('renders the shared TransitionHistory component with the incident stateHistory, in order', () => {
    render(
      <IncidentDetailPublic
        incident={{
          id: '1',
          title: 'API Down',
          stateHistory: [
            { state: 'open', timestamp: '2026-08-18T08:00:00Z' },
            { state: 'resolved', timestamp: '2026-08-18T09:00:00Z' },
          ],
        }}
      />
    );

    expect(screen.getByText('API Down')).toBeInTheDocument();
    const rows = screen.getAllByTestId('transition-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('open');
    expect(rows[1]).toHaveTextContent('resolved');
  });

  it('renders the empty-state message when the incident has no transition history', () => {
    render(<IncidentDetailPublic incident={{ id: '1', title: 'New incident', stateHistory: [] }} />);
    expect(screen.getByText('No transitions recorded')).toBeInTheDocument();
  });

  it('renders a not-found message when no incident is given', () => {
    render(<IncidentDetailPublic incident={null} />);
    expect(screen.getByTestId('incident-detail-public-empty')).toBeInTheDocument();
  });
});
