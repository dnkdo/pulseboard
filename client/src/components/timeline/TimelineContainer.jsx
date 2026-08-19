import { useCallback, useEffect, useState } from 'react';
import TimelineFilterBar from '../filters/TimelineFilterBar.jsx';
import IncidentTimeline from './IncidentTimeline.jsx';
import ExportMenu from '../IncidentHistory/ExportMenu.jsx';
import { buildFilterQueryString } from '../../utils/buildFilterQueryString.js';
import { exportIncidentHistory } from '../../services/incidentExportService.js';

const EMPTY_FILTERS = Object.freeze({ severity: '', startDate: '', endDate: '' });

// Owns the timeline's filter state (lifted here so TimelineFilterBar and
// IncidentTimeline both derive from one source of truth) and refetches
// GET /api/incidents — filtered server-side via filterIncidents.js, whose
// query params buildFilterQueryString serializes — every time a filter
// changes. Clearing resets to EMPTY_FILTERS, which buildFilterQueryString
// turns into an empty query string, naturally restoring the full list.
//
// ExportMenu (PLB-105) is rendered here too, alongside TimelineFilterBar,
// rather than in a separate view, because this component is the incident
// history view in this codebase — it's the one place that already owns the
// current severity/date-range filter state an export needs to match (AC3).
export default function TimelineContainer({ fetchImpl = fetch, exportImpl = exportIncidentHistory }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const loadIncidents = useCallback(
    async (currentFilters) => {
      setStatus('loading');
      setError(null);
      try {
        const queryString = buildFilterQueryString(currentFilters);
        const url = queryString ? `/api/incidents?${queryString}` : '/api/incidents';
        const response = await fetchImpl(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch incidents: ${response.status}`);
        }
        const data = await response.json();
        setIncidents(Array.isArray(data) ? data : []);
        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    },
    [fetchImpl]
  );

  useEffect(() => {
    loadIncidents(filters);
  }, [filters, loadIncidents]);

  const handleSeverityChange = useCallback((severity) => {
    setFilters((prev) => ({ ...prev, severity }));
  }, []);

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setFilters((prev) => ({ ...prev, startDate, endDate }));
  }, []);

  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // Passes the same filters object currently driving the visible timeline
  // (not a re-derived copy) so a downloaded file can never disagree with
  // what's on screen, satisfying AC3.
  const handleExport = useCallback(
    async (format) => {
      setIsExporting(true);
      setExportError(null);
      try {
        await exportImpl({ format, ...filters });
      } catch (err) {
        setExportError(err.message);
      } finally {
        setIsExporting(false);
      }
    },
    [exportImpl, filters]
  );

  return (
    <div data-testid="timeline-container">
      <TimelineFilterBar
        severity={filters.severity}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onSeverityChange={handleSeverityChange}
        onDateRangeChange={handleDateRangeChange}
        onClear={handleClear}
      />
      <ExportMenu onSelect={handleExport} isExporting={isExporting} error={exportError} />
      <IncidentTimeline incidents={incidents} isLoading={status === 'loading'} error={error} />
    </div>
  );
}
