import { useState } from 'react';

// ISO 8601 "YYYY-MM-DD" date-input values compare correctly with plain
// string comparison, so no Date parsing is needed here.
function isInvalidRange(startDate, endDate) {
  return Boolean(startDate) && Boolean(endDate) && startDate > endDate;
}

// Controlled date-range filter for the internal dashboard's incident
// timeline. `startDate`/`endDate` and `onChange` are owned by the parent
// (TimelineContainer) — this component holds no filter state of its own,
// only the transient validation-error message. An edit that would put
// startDate after endDate is rejected (error shown, onChange not called)
// rather than propagated and silently returning zero matches.
export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [error, setError] = useState(null);

  function commit(nextStart, nextEnd) {
    if (isInvalidRange(nextStart, nextEnd)) {
      setError('Start date must be on or before end date');
      return;
    }
    setError(null);
    onChange({ startDate: nextStart, endDate: nextEnd });
  }

  return (
    <div>
      <label htmlFor="timeline-start-date">Start date</label>
      <input
        id="timeline-start-date"
        type="date"
        data-testid="date-range-start"
        value={startDate ?? ''}
        onChange={(event) => commit(event.target.value, endDate ?? '')}
      />
      <label htmlFor="timeline-end-date">End date</label>
      <input
        id="timeline-end-date"
        type="date"
        data-testid="date-range-end"
        value={endDate ?? ''}
        onChange={(event) => commit(startDate ?? '', event.target.value)}
      />
      {error && (
        <span role="alert" data-testid="date-range-error">
          {error}
        </span>
      )}
    </div>
  );
}
