import { SEVERITIES } from '../../models/schema.js';

// Controlled severity filter for the internal dashboard's incident timeline.
// Holds no state of its own — `value` (empty string means "all severities")
// and `onChange` are owned by the parent (TimelineContainer) per the
// lifted-state requirement. Options are sourced from the client-local schema
// module's canonical SEVERITIES enum (client/src/models/schema.js, mirroring
// the repo root's src/models/schema.js) rather than a re-declared list, so a
// new severity level never needs a second edit here.
export default function SeverityDropdown({ value, onChange }) {
  return (
    <div>
      <label htmlFor="timeline-severity-filter">Severity</label>
      <select
        id="timeline-severity-filter"
        data-testid="severity-dropdown"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All severities</option>
        {SEVERITIES.map((severity) => (
          <option key={severity} value={severity}>
            {severity}
          </option>
        ))}
      </select>
    </div>
  );
}
