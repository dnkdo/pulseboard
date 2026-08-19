// Pure formatting helper, shared by any view that needs to render a
// timestamp the same way. Parts are assembled year-first (rather than a
// locale's native "Mon D, YYYY" ordering) and pinned to UTC so the output is
// deterministic regardless of the host machine's locale/timezone.
const PART_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

export function formatTimestamp(rawTimestamp) {
  if (!rawTimestamp) {
    return 'Unknown time';
  }

  const date = new Date(rawTimestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  const parts = Object.fromEntries(PART_FORMAT.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}, ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

export default formatTimestamp;
