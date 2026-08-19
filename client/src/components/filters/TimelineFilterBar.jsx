import SeverityDropdown from './SeverityDropdown.jsx';
import DateRangePicker from './DateRangePicker.jsx';

// Composes the severity and date-range filter controls above the incident
// timeline. Holds no filter state of its own — severity/startDate/endDate
// and every change handler are owned by the parent (TimelineContainer),
// which lifts them so a single source of truth drives both the visible
// controls and the fetch/re-render of the timeline below.
export default function TimelineFilterBar({
  severity,
  startDate,
  endDate,
  onSeverityChange,
  onDateRangeChange,
  onClear,
}) {
  const hasActiveFilters = Boolean(severity) || Boolean(startDate) || Boolean(endDate);

  return (
    <div data-testid="timeline-filter-bar">
      <SeverityDropdown value={severity} onChange={onSeverityChange} />
      <DateRangePicker startDate={startDate} endDate={endDate} onChange={onDateRangeChange} />
      <button
        type="button"
        data-testid="clear-filters-button"
        onClick={onClear}
        disabled={!hasActiveFilters}
      >
        Clear filters
      </button>
    </div>
  );
}
