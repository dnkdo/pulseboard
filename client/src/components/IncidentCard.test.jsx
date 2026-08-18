// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import IncidentCard from './IncidentCard.jsx';

afterEach(() => {
  cleanup();
});

describe('IncidentCard', () => {
  it('renders the incident title, severity, and status', () => {
    render(<IncidentCard incident={{ id: '1', title: 'API Down', status: 'open', severity: 'SEV1' }} />);

    expect(screen.getByText('API Down')).toBeInTheDocument();
    expect(screen.getByTestId('incident-severity-badge')).toHaveTextContent('Sev1');
    expect(screen.getByTestId('incident-status-badge')).toHaveTextContent('Open');
  });

  it('falls back to placeholder text for a missing title', () => {
    render(<IncidentCard incident={{ id: '1', status: 'open', severity: 'SEV2' }} />);
    expect(screen.getByText('Untitled incident')).toBeInTheDocument();
  });

  it('omits the timestamp element when no valid timestamp is present', () => {
    render(<IncidentCard incident={{ id: '1', title: 'No Timestamp', status: 'open', severity: 'SEV2' }} />);
    expect(screen.queryByText(/\d{4}/)).not.toBeInTheDocument();
  });

  it('renders a formatted timestamp when one is present', () => {
    render(
      <IncidentCard
        incident={{ id: '1', title: 'Has Timestamp', status: 'open', severity: 'SEV2', timestamp: '2026-01-01T00:00:00Z' }}
      />
    );
    expect(screen.getByText(new Date('2026-01-01T00:00:00Z').toLocaleString())).toBeInTheDocument();
  });
});
