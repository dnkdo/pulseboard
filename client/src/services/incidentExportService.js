// Export-and-download service for the incident history view (PLB-105).
// Separate from lib/api/incidents.js (the shared JSON-fetching API client)
// because this concern is fundamentally different: a blob response plus a
// browser-download side effect, not a normalized data shape a component
// renders. Reuses buildFilterQueryString (the same utility TimelineContainer
// uses for GET /api/incidents) so the export request's severity/date-range
// params are always serialized identically to the visible, filtered list —
// the guarantee AC3 depends on.
import { buildFilterQueryString } from '../utils/buildFilterQueryString.js';

const EXTENSIONS_BY_FORMAT = { csv: 'csv', json: 'json' };

function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) {
    return fallback;
  }
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match ? match[1] : fallback;
}

// Split out from exportIncidentHistory so unit tests can exercise the
// download mechanics (object URL + synthetic <a> click) without also
// mocking fetch, and so the mechanics never silently take extra params on.
export function triggerDownload(blob, filename, { documentImpl = document, urlImpl = URL } = {}) {
  const objectUrl = urlImpl.createObjectURL(blob);
  const link = documentImpl.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  documentImpl.body.appendChild(link);
  link.click();
  documentImpl.body.removeChild(link);
  urlImpl.revokeObjectURL(objectUrl);
}

// format defaults to 'json' and falls back to 'json' for any unrecognized
// value, mirroring server/src/routes/incidents.js's own default/fallback so
// the extension used here can never disagree with the extension the server
// put in the response body.
export async function exportIncidentHistory(
  { format, severity, startDate, endDate } = {},
  { fetchImpl = fetch, documentImpl = document, urlImpl = URL } = {},
) {
  const normalizedFormat = Object.prototype.hasOwnProperty.call(EXTENSIONS_BY_FORMAT, format) ? format : 'json';

  const filterQuery = buildFilterQueryString({ severity, startDate, endDate });
  const params = new URLSearchParams(filterQuery);
  params.set('format', normalizedFormat);

  const response = await fetchImpl(`/api/incidents/export?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`GET /api/incidents/export failed: ${response.status}`);
  }

  const blob = await response.blob();
  const fallbackFilename = `incident-history-export.${EXTENSIONS_BY_FORMAT[normalizedFormat]}`;
  const contentDisposition = response.headers?.get?.('Content-Disposition');
  const filename = extractFilename(contentDisposition, fallbackFilename);

  triggerDownload(blob, filename, { documentImpl, urlImpl });

  return { filename, format: normalizedFormat };
}

export default exportIncidentHistory;
