// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import PublicIncidentDetail from './PublicIncidentDetail.jsx';
import { getIncidentById } from '../../lib/api/incidents.js';

vi.mock('../../lib/api/incidents.js', () => ({
  getIncidentById: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderAt(incidentId) {
  return render(
    <MemoryRouter initialEntries={[`/status/incidents/${incidentId}`]}>
      <Routes>
        <Route path="/status/incidents/:incidentId" element={<PublicIncidentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Fabricated internal-only fields (internalNotes, assignee) even though the
// server doesn't currently emit them for GET /api/incidents/:id — the
// allow-list in PublicIncidentDetail must exclude them by construction
// regardless of what the API happens to send, per the PLB-97 field-filtering
// acceptance criterion.
const FULL_INCIDENT = {
  id: 'inc-1',
  title: 'API latency spike',
  severity: 'SEV1',
  status: 'investigating',
  affectedComponents: ['api', 'edge-cache'],
  stateHistory: [
    { state: 'open', timestamp: '2026-08-18T08:00:00Z' },
    { state: 'investigating', timestamp: '2026-08-18T09:00:00Z' },
  ],
  internalNotes: 'Paged on-call via PagerDuty, waiting on DB team confirmation',
  assignee: 'jane.doe@pulseboard.internal',
};

describe('PublicIncidentDetail', () => {
  it('AC: renders title, severity, status, affectedComponents, and TransitionHistory for a valid incident id', async () => {
    getIncidentById.mockResolvedValue(FULL_INCIDENT);

    renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('public-incident-detail')).toBeInTheDocument());
    expect(screen.getByTestId('public-incident-detail-title')).toHaveTextContent(
      'API latency spike',
    );
    expect(screen.getByTestId('public-incident-detail-severity')).toHaveTextContent('Sev1');
    expect(screen.getByTestId('public-incident-detail-status')).toHaveTextContent('investigating');
    expect(screen.getByTestId('public-incident-detail-affected-components')).toHaveTextContent(
      'api, edge-cache',
    );

    const rows = screen.getAllByTestId('transition-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('open');
    expect(rows[1]).toHaveTextContent('investigating');
  });

  it('extracts incidentId from the route params and requests that exact id', async () => {
    getIncidentById.mockResolvedValue(FULL_INCIDENT);

    renderAt('inc-42');

    await waitFor(() => expect(getIncidentById).toHaveBeenCalledWith('inc-42'));
  });

  it('AC: never renders internalNotes or assignee, even though the mocked API response includes them', async () => {
    getIncidentById.mockResolvedValue(FULL_INCIDENT);

    const { container } = renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('public-incident-detail')).toBeInTheDocument());

    expect(container.textContent).not.toContain(FULL_INCIDENT.internalNotes);
    expect(container.textContent).not.toContain(FULL_INCIDENT.assignee);
    expect(container.textContent).not.toContain('jane.doe');
    expect(container.innerHTML).not.toContain('internalNotes');
    expect(container.innerHTML).not.toContain('assignee');
  });

  it('renders the transition history empty state when the incident has zero recorded transitions', async () => {
    getIncidentById.mockResolvedValue({ ...FULL_INCIDENT, stateHistory: [] });

    renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('transition-history-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('transition-history-list')).not.toBeInTheDocument();
  });

  it('renders a loading state before the fetch resolves', async () => {
    let resolveFetch;
    getIncidentById.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderAt('inc-1');

    expect(screen.getByTestId('public-incident-detail-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('public-incident-detail')).not.toBeInTheDocument();

    resolveFetch(FULL_INCIDENT);
    await waitFor(() => expect(screen.getByTestId('public-incident-detail')).toBeInTheDocument());
  });

  it('AC: renders the dedicated IncidentNotFound state, without crashing, when getIncidentById resolves null (404)', async () => {
    getIncidentById.mockResolvedValue(null);

    renderAt('does-not-exist');

    await waitFor(() =>
      expect(screen.getByTestId('public-incident-detail-not-found')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('public-incident-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('public-incident-detail-error')).not.toBeInTheDocument();
    expect(screen.getByText('This incident could not be found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to status page/i })).toHaveAttribute(
      'href',
      '/status',
    );
  });

  it('renders a generic error state (not the not-found state) when the fetch rejects with a network/server failure', async () => {
    getIncidentById.mockRejectedValue(new Error('Failed to fetch incident inc-1: 500'));

    renderAt('inc-1');

    await waitFor(() =>
      expect(screen.getByTestId('public-incident-detail-error')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('public-incident-detail-error')).toHaveTextContent(
      'Failed to fetch incident inc-1: 500',
    );
    expect(screen.queryByTestId('public-incident-detail-not-found')).not.toBeInTheDocument();
  });

  it('retries the fetch when the retry action is clicked after an error, and recovers to the success state', async () => {
    getIncidentById
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(FULL_INCIDENT);

    renderAt('inc-1');

    await waitFor(() =>
      expect(screen.getByTestId('public-incident-detail-error')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('public-incident-detail-retry'));

    await waitFor(() => expect(screen.getByTestId('public-incident-detail')).toBeInTheDocument());
    expect(getIncidentById).toHaveBeenCalledTimes(2);
  });
});
