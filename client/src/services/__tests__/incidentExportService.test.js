// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { exportIncidentHistory, triggerDownload } from '../incidentExportService.js';

function makeBlobResponse({ ok = true, status = 200, headers = {}, blob = new Blob(['data']) } = {}) {
  return {
    ok,
    status,
    headers: { get: (key) => headers[key] ?? null },
    blob: async () => blob,
  };
}

describe('exportIncidentHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AC1: requests the CSV format and downloads a filename with a .csv extension', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeBlobResponse());
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    const link = { click: vi.fn(), setAttribute: vi.fn() };
    const documentImpl = {
      createElement: vi.fn().mockReturnValue(link),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };

    const result = await exportIncidentHistory(
      { format: 'csv' },
      { fetchImpl, documentImpl, urlImpl: { createObjectURL, revokeObjectURL } }
    );

    expect(fetchImpl).toHaveBeenCalledWith('/api/incidents/export?format=csv');
    expect(result.filename).toBe('incident-history-export.csv');
    expect(link.download).toBe('incident-history-export.csv');
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('AC2: requests the JSON format and downloads a filename with a .json extension', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeBlobResponse());
    const link = { click: vi.fn() };
    const documentImpl = {
      createElement: vi.fn().mockReturnValue(link),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };

    const result = await exportIncidentHistory(
      { format: 'json' },
      { fetchImpl, documentImpl, urlImpl: { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() } }
    );

    expect(fetchImpl).toHaveBeenCalledWith('/api/incidents/export?format=json');
    expect(result.filename).toBe('incident-history-export.json');
    expect(link.download).toBe('incident-history-export.json');
  });

  it('defaults to json when format is omitted or unrecognized', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeBlobResponse());
    const documentImpl = {
      createElement: vi.fn().mockReturnValue({ click: vi.fn() }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };
    const urlImpl = { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() };

    await exportIncidentHistory({ format: 'xml' }, { fetchImpl, documentImpl, urlImpl });

    expect(fetchImpl).toHaveBeenCalledWith('/api/incidents/export?format=json');
  });

  it('AC3: includes the active severity and date-range filters as request query params', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeBlobResponse());
    const documentImpl = {
      createElement: vi.fn().mockReturnValue({ click: vi.fn() }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };
    const urlImpl = { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() };

    await exportIncidentHistory(
      { format: 'csv', severity: 'SEV1', startDate: '2026-08-01', endDate: '2026-08-15' },
      { fetchImpl, documentImpl, urlImpl }
    );

    const requestedUrl = fetchImpl.mock.calls[0][0];
    const params = new URLSearchParams(requestedUrl.split('?')[1]);
    expect(params.get('format')).toBe('csv');
    expect(params.get('severity')).toBe('SEV1');
    expect(params.get('startDate')).toBe('2026-08-01');
    expect(params.get('endDate')).toBe('2026-08-15');
  });

  it('omits filter params that are empty, matching buildFilterQueryString semantics', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeBlobResponse());
    const documentImpl = {
      createElement: vi.fn().mockReturnValue({ click: vi.fn() }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };
    const urlImpl = { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() };

    await exportIncidentHistory(
      { format: 'json', severity: '', startDate: '', endDate: '' },
      { fetchImpl, documentImpl, urlImpl }
    );

    expect(fetchImpl).toHaveBeenCalledWith('/api/incidents/export?format=json');
  });

  it('prefers a server-provided filename from Content-Disposition over the default', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeBlobResponse({ headers: { 'Content-Disposition': 'attachment; filename="incidents.csv"' } }));
    const link = { click: vi.fn() };
    const documentImpl = {
      createElement: vi.fn().mockReturnValue(link),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };
    const urlImpl = { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() };

    const result = await exportIncidentHistory({ format: 'csv' }, { fetchImpl, documentImpl, urlImpl });

    expect(result.filename).toBe('incidents.csv');
    expect(link.download).toBe('incidents.csv');
  });

  it('throws and does not attempt a download when the request fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeBlobResponse({ ok: false, status: 500 }));
    const documentImpl = { createElement: vi.fn() };
    const urlImpl = { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() };

    await expect(exportIncidentHistory({ format: 'csv' }, { fetchImpl, documentImpl, urlImpl })).rejects.toThrow(
      'GET /api/incidents/export failed: 500'
    );
    expect(documentImpl.createElement).not.toHaveBeenCalled();
  });
});

describe('triggerDownload', () => {
  it('creates an object URL, clicks a synthetic anchor with the given filename, then revokes the URL', () => {
    const link = { click: vi.fn() };
    const documentImpl = {
      createElement: vi.fn().mockReturnValue(link),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };
    const urlImpl = { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() };
    const blob = new Blob(['contents']);

    triggerDownload(blob, 'report.json', { documentImpl, urlImpl });

    expect(urlImpl.createObjectURL).toHaveBeenCalledWith(blob);
    expect(link.href).toBe('blob:mock-url');
    expect(link.download).toBe('report.json');
    expect(documentImpl.body.appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(documentImpl.body.removeChild).toHaveBeenCalledWith(link);
    expect(urlImpl.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
