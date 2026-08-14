import { describe, it, expect } from 'vitest';
import { toCSV, toJSON } from '../../server/utils/exportIncidents.js';

describe('toCSV', () => {
  const incidents = [
    { id: 1, title: 'API Outage', severity: 'SEV1', status: 'resolved', createdAt: '2026-08-01' },
    { id: 2, title: 'DB Failover', severity: 'SEV2', status: 'open', createdAt: '2026-08-05' },
    { id: 3, title: 'Latency, spike "at peak"', severity: 'SEV3', status: 'investigating', createdAt: '2026-08-10' },
  ];

  it('matches the test-contract fixture exactly', () => {
    expect(toCSV([{ id: 1, title: 'API Outage', severity: 'SEV1', status: 'resolved', createdAt: '2026-08-01' }])).toBe(
      'id,title,severity,status,createdAt\n1,API Outage,SEV1,resolved,2026-08-01'
    );
  });

  it('returns a header row plus one row per incident, with fields in the same key order as the header', () => {
    const lines = toCSV(incidents).split('\n');
    expect(lines).toHaveLength(incidents.length + 1);

    const header = lines[0].split(',');
    expect(header).toEqual(['id', 'title', 'severity', 'status', 'createdAt']);

    // Row 2 (index 1 in lines, incidents[1]) has no fields needing escaping,
    // so a plain split-on-comma should align positionally with the header.
    const row2 = lines[2].split(',');
    expect(row2[header.indexOf('id')]).toBe('2');
    expect(row2[header.indexOf('title')]).toBe('DB Failover');
    expect(row2[header.indexOf('severity')]).toBe('SEV2');
    expect(row2[header.indexOf('status')]).toBe('open');
    expect(row2[header.indexOf('createdAt')]).toBe('2026-08-05');
  });

  it('quotes and escapes fields containing commas or double quotes (RFC 4180)', () => {
    const lines = toCSV(incidents).split('\n');
    const row3 = lines[3];
    expect(row3).toBe('3,"Latency, spike ""at peak""",SEV3,investigating,2026-08-10');
  });

  it('escapes embedded newlines by quoting the field', () => {
    const csv = toCSV([{ id: 9, title: 'Line one\nLine two', severity: 'SEV1', status: 'open', createdAt: '2026-08-11' }]);
    const rows = csv.split('\n');
    // The escaped newline is inside a quoted field, so it still shows up as
    // an extra physical line, but the logical row count (by field content)
    // is what matters — verify the quoted field round-trips as one field.
    expect(csv).toContain('"Line one\nLine two"');
    expect(rows[0]).toBe('id,title,severity,status,createdAt');
  });

  it('falls back to a fixed field list and still emits a header for an empty array', () => {
    expect(toCSV([])).toBe('id,title,severity,status,createdAt,resolvedAt');
  });

  it('renders null/undefined field values as empty strings without breaking column count', () => {
    const csv = toCSV([{ id: 4, title: 'No resolution yet', severity: 'SEV2', status: 'open', resolvedAt: null }]);
    const lines = csv.split('\n');
    expect(lines[1].split(',')).toEqual(['4', 'No resolution yet', 'SEV2', 'open', '']);
  });
});

describe('toJSON', () => {
  it('matches the test-contract fixture exactly', () => {
    expect(toJSON([{ id: 1, title: 'API Outage' }])).toBe('[{"id":1,"title":"API Outage"}]');
  });

  it('round-trips: JSON.parse(toJSON(x)) deep-equals x for a populated array', () => {
    const incidents = [
      { id: 1, title: 'API Outage', severity: 'SEV1', status: 'resolved', createdAt: '2026-08-01' },
      { id: 2, title: 'DB Failover', severity: 'SEV2', status: 'open', createdAt: '2026-08-05', tags: ['db', 'infra'] },
    ];
    expect(JSON.parse(toJSON(incidents))).toEqual(incidents);
  });

  it('round-trips an empty array', () => {
    expect(toJSON([])).toBe('[]');
    expect(JSON.parse(toJSON([]))).toEqual([]);
  });
});
