// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import TimelineContainer from './TimelineContainer.jsx';

afterEach(() => {
  cleanup();
});

const ALL_INCIDENTS = [
  { id: '1', title: 'API Latency Spike', severity: 'SEV1', createdAt: '2026-08-01' },
  { id: '2', title: 'Minor UI Glitch', severity: 'SEV3', createdAt: '2026-08-05' },
  { id: '3', title: 'Database Outage', severity: 'SEV1', createdAt: '2026-08-12' },
];

// Mirrors server/utils/filterIncidents.js's semantics so this test exercises
// the real contract: TimelineContainer must forward buildFilterQueryString's
// output as real query params to GET /api/incidents, not filter locally.
function makeFetchImpl() {
  return vi.fn((url) => {
    const [, queryString] = url.split('?');
    const params = new URLSearchParams(queryString ?? '');
    const severity = params.get('severity');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');

    let filtered = ALL_INCIDENTS;
    if (severity) {
      const severitySet = new Set(severity.split(','));
      filtered = filtered.filter((incident) => severitySet.has(incident.severity));
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter((incident) => new Date(incident.createdAt).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter((incident) => new Date(incident.createdAt).getTime() <= endMs);
    }

    return Promise.resolve({ ok: true, json: async () => filtered });
  });
}

function entryIds() {
  return screen.getAllByTestId(/^incident-timeline-entry-/).map((el) => el.getAttribute('data-testid'));
}

// IncidentTimeline (rendered by TimelineContainer) renders entries as
// react-router-dom <Link>s (PLB-98), so every render needs a Router in the tree.
function renderContainer(props) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TimelineContainer {...props} />
    </MemoryRouter>,
  );
}

describe('TimelineContainer', () => {
  it('loads and renders the full unfiltered incident list on mount', async () => {
    const fetchImpl = makeFetchImpl();
    renderContainer({ fetchImpl });

    await waitFor(() => expect(entryIds()).toHaveLength(3));
    expect(fetchImpl).toHaveBeenCalledWith('/api/incidents');
  });

  it('AC: selecting a severity re-renders the timeline showing only matching incidents', async () => {
    const fetchImpl = makeFetchImpl();
    renderContainer({ fetchImpl });
    await waitFor(() => expect(entryIds()).toHaveLength(3));

    fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: 'SEV1' } });

    await waitFor(() => expect(entryIds()).toHaveLength(2));
    expect(screen.getByTestId('incident-timeline-entry-1')).toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline-entry-3')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline-entry-2')).not.toBeInTheDocument();
    expect(fetchImpl).toHaveBeenLastCalledWith('/api/incidents?severity=SEV1');
  });

  it('AC: selecting a date range re-renders the timeline showing only matching incidents', async () => {
    const fetchImpl = makeFetchImpl();
    renderContainer({ fetchImpl });
    await waitFor(() => expect(entryIds()).toHaveLength(3));

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-02' } });

    await waitFor(() => expect(entryIds()).toHaveLength(2));
    expect(screen.getByTestId('incident-timeline-entry-2')).toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline-entry-3')).toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline-entry-1')).not.toBeInTheDocument();
  });

  it('composes severity and date-range filters together (AND semantics)', async () => {
    const fetchImpl = makeFetchImpl();
    renderContainer({ fetchImpl });
    await waitFor(() => expect(entryIds()).toHaveLength(3));

    fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: 'SEV1' } });
    await waitFor(() => expect(entryIds()).toHaveLength(2));

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-02' } });

    await waitFor(() => expect(entryIds()).toHaveLength(1));
    expect(screen.getByTestId('incident-timeline-entry-3')).toBeInTheDocument();
  });

  it('AC: clearing all filters restores the full unfiltered incident list', async () => {
    const fetchImpl = makeFetchImpl();
    renderContainer({ fetchImpl });
    await waitFor(() => expect(entryIds()).toHaveLength(3));

    fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: 'SEV1' } });
    await waitFor(() => expect(entryIds()).toHaveLength(2));

    fireEvent.click(screen.getByTestId('clear-filters-button'));

    await waitFor(() => expect(entryIds()).toHaveLength(3));
    expect(fetchImpl).toHaveBeenLastCalledWith('/api/incidents');
    expect(screen.getByTestId('severity-dropdown')).toHaveValue('');
  });

  it('shows an error state and does not crash when the fetch fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    renderContainer({ fetchImpl });

    await waitFor(() => expect(screen.getByTestId('incident-timeline-error')).toBeInTheDocument());
  });

  describe('export (PLB-105)', () => {
    it('AC3: exports using the currently active severity and date-range filters, not a stale snapshot', async () => {
      const fetchImpl = makeFetchImpl();
      const exportImpl = vi.fn().mockResolvedValue({ filename: 'incident-history-export.csv', format: 'csv' });
      renderContainer({ fetchImpl, exportImpl });
      await waitFor(() => expect(entryIds()).toHaveLength(3));

      fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: 'SEV1' } });
      await waitFor(() => expect(entryIds()).toHaveLength(2));
      fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-02' } });
      await waitFor(() => expect(entryIds()).toHaveLength(1));

      fireEvent.click(screen.getByTestId('export-menu-trigger'));
      fireEvent.click(screen.getByTestId('export-menu-option-csv'));

      await waitFor(() => expect(exportImpl).toHaveBeenCalledTimes(1));
      expect(exportImpl).toHaveBeenCalledWith({
        format: 'csv',
        severity: 'SEV1',
        startDate: '2026-08-02',
        endDate: '',
      });
    });

    it('AC2: forwards the "json" format when the JSON export option is selected', async () => {
      const fetchImpl = makeFetchImpl();
      const exportImpl = vi.fn().mockResolvedValue({ filename: 'incident-history-export.json', format: 'json' });
      renderContainer({ fetchImpl, exportImpl });
      await waitFor(() => expect(entryIds()).toHaveLength(3));

      fireEvent.click(screen.getByTestId('export-menu-trigger'));
      fireEvent.click(screen.getByTestId('export-menu-option-json'));

      await waitFor(() => expect(exportImpl).toHaveBeenCalledWith({ format: 'json', severity: '', startDate: '', endDate: '' }));
    });

    it('disables the export trigger while the export request is in flight, then re-enables it', async () => {
      const fetchImpl = makeFetchImpl();
      let resolveExport;
      const exportImpl = vi.fn(() => new Promise((resolve) => { resolveExport = resolve; }));
      renderContainer({ fetchImpl, exportImpl });
      await waitFor(() => expect(entryIds()).toHaveLength(3));

      fireEvent.click(screen.getByTestId('export-menu-trigger'));
      fireEvent.click(screen.getByTestId('export-menu-option-csv'));

      await waitFor(() => expect(screen.getByTestId('export-menu-trigger')).toBeDisabled());

      resolveExport({ filename: 'incident-history-export.csv', format: 'csv' });

      await waitFor(() => expect(screen.getByTestId('export-menu-trigger')).not.toBeDisabled());
    });

    it('surfaces an error message and re-enables the trigger when the export request fails', async () => {
      const fetchImpl = makeFetchImpl();
      const exportImpl = vi.fn().mockRejectedValue(new Error('GET /api/incidents/export failed: 500'));
      renderContainer({ fetchImpl, exportImpl });
      await waitFor(() => expect(entryIds()).toHaveLength(3));

      fireEvent.click(screen.getByTestId('export-menu-trigger'));
      fireEvent.click(screen.getByTestId('export-menu-option-csv'));

      await waitFor(() => expect(screen.getByTestId('export-menu-error')).toHaveTextContent('GET /api/incidents/export failed: 500'));
      expect(screen.getByTestId('export-menu-trigger')).not.toBeDisabled();
    });
  });
});
