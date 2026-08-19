// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import IncidentDetailInternal from './IncidentDetailInternal.jsx';

afterEach(() => {
  cleanup();
});

describe('IncidentDetailInternal', () => {
  it('renders the shared TransitionHistory component with the incident stateHistory, in order', () => {
    render(
      <IncidentDetailInternal
        incident={{
          id: '1',
          title: 'API Down',
          summary: 'Elevated 5xx rates on the API',
          stateHistory: [
            { state: 'open', timestamp: '2026-08-18T08:00:00Z' },
            { state: 'investigating', timestamp: '2026-08-18T08:30:00Z' },
          ],
        }}
      />
    );

    expect(screen.getByText('API Down')).toBeInTheDocument();
    const rows = screen.getAllByTestId('transition-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('open');
    expect(rows[1]).toHaveTextContent('investigating');
  });

  it('renders the empty-state message when the incident has no transition history', () => {
    render(<IncidentDetailInternal incident={{ id: '1', title: 'New incident', stateHistory: [] }} />);
    expect(screen.getByText('No transitions recorded')).toBeInTheDocument();
  });

  it('renders a not-found message when no incident is given', () => {
    render(<IncidentDetailInternal incident={null} />);
    expect(screen.getByTestId('incident-detail-internal-empty')).toBeInTheDocument();
  });
});
