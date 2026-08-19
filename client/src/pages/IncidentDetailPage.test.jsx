// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import IncidentDetailPage from './IncidentDetailPage.jsx';
import { getIncidentById } from '../lib/api/incidents.js';

vi.mock('../lib/api/incidents.js', () => ({
  getIncidentById: vi.fn(),
}));

afterEach(() => {
  cleanup();
  // getIncidentById is a plain vi.fn(), not a vi.spyOn() spy — restoreAllMocks
  // only resets spies, so call counts and queued *Once() values would
  // otherwise leak across tests in this file. clearAllMocks resets both.
  vi.clearAllMocks();
});

function renderAt(incidentId) {
  return render(
    <MemoryRouter initialEntries={[`/incidents/${incidentId}`]}>
      <Routes>
        <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const FULL_INCIDENT = {
  id: 'inc-1',
  title: 'API latency spike',
  severity: 'SEV1',
  status: 'investigating',
  summary: 'Elevated p99 latency on the core API',
  affectedComponents: ['api', 'edge-cache'],
  stateHistory: [
    { state: 'open', timestamp: '2026-08-18T08:00:00Z' },
    { state: 'investigating', timestamp: '2026-08-18T09:00:00Z' },
  ],
};

describe('IncidentDetailPage', () => {
  it('AC1: renders title, severity, status, and internal-only fields (summary, affected components) for a valid incident', async () => {
    getIncidentById.mockResolvedValue(FULL_INCIDENT);

    renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('incident-detail')).toBeInTheDocument());
    expect(screen.getByTestId('incident-detail-title')).toHaveTextContent('API latency spike');
    expect(screen.getByTestId('incident-detail-severity')).toHaveTextContent('SEV1');
    expect(screen.getByTestId('incident-detail-status')).toHaveTextContent('investigating');
    expect(screen.getByTestId('incident-detail-summary')).toHaveTextContent('Elevated p99 latency on the core API');
    expect(screen.getByTestId('incident-detail-affected-components')).toHaveTextContent('api, edge-cache');
  });

  it('extracts incidentId from the route params and requests that exact id', async () => {
    getIncidentById.mockResolvedValue(FULL_INCIDENT);

    renderAt('inc-42');

    await waitFor(() => expect(getIncidentById).toHaveBeenCalledWith('inc-42'));
  });

  it('AC2: passes the full transition list from the fetched incident record into TransitionHistory below the details section', async () => {
    getIncidentById.mockResolvedValue(FULL_INCIDENT);

    renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('transition-history-list')).toBeInTheDocument());
    const rows = screen.getAllByTestId('transition-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('open');
    expect(rows[1]).toHaveTextContent('investigating');

    // Transition history must render below (after, in document order) the
    // incident details section, not above or interleaved with it.
    const fieldsSection = screen.getByTestId('incident-detail-fields');
    const transitionsSection = screen.getByTestId('incident-detail-transitions');
    // eslint-disable-next-line no-bitwise
    expect(fieldsSection.compareDocumentPosition(transitionsSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

    expect(screen.getByTestId('incident-detail-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-detail')).not.toBeInTheDocument();

    resolveFetch(FULL_INCIDENT);
    await waitFor(() => expect(screen.getByTestId('incident-detail')).toBeInTheDocument());
  });

  it('AC3: renders a dedicated not-found state, without crashing, when getIncidentById resolves null (404)', async () => {
    getIncidentById.mockResolvedValue(null);

    renderAt('does-not-exist');

    await waitFor(() => expect(screen.getByTestId('incident-detail-not-found')).toBeInTheDocument());
    expect(screen.queryByTestId('incident-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('incident-detail-error')).not.toBeInTheDocument();
  });

  it('renders an inline error state (not the not-found state) when the fetch rejects with a server/network failure', async () => {
    getIncidentById.mockRejectedValue(new Error('Failed to fetch incident inc-1: 500'));

    renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('incident-detail-error')).toBeInTheDocument());
    expect(screen.getByTestId('incident-detail-error')).toHaveTextContent('Failed to fetch incident inc-1: 500');
    expect(screen.queryByTestId('incident-detail-not-found')).not.toBeInTheDocument();
  });

  it('retries the fetch when the retry action is clicked after an error, and recovers to the success state', async () => {
    getIncidentById.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(FULL_INCIDENT);

    renderAt('inc-1');

    await waitFor(() => expect(screen.getByTestId('incident-detail-error')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('incident-detail-retry'));

    await waitFor(() => expect(screen.getByTestId('incident-detail')).toBeInTheDocument());
    expect(getIncidentById).toHaveBeenCalledTimes(2);
  });
});
