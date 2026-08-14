import { describe, it, expect } from 'vitest';
import { validateIncident } from '../../src/lib/validateIncident.js';

describe('validateIncident', () => {
  it('matches the .adlc test-contract case: rejects an incident missing required fields', () => {
    const result = validateIncident({ title: '', severity: 'SEV2', components: [], summary: '' });
    expect(result).toEqual(expect.arrayContaining(['title', 'components', 'summary']));
    expect(result).not.toContain('severity');
  });

  it('matches the .adlc test-contract case: accepts a fully populated payload', () => {
    const result = validateIncident({
      title: 'API latency spike',
      severity: 'SEV2',
      components: ['api'],
      summary: 'Elevated p99 latency',
    });
    expect(result).toEqual([]);
  });

  it('flags every required field as missing when the payload is empty', () => {
    expect(validateIncident({})).toEqual(
      expect.arrayContaining(['title', 'severity', 'components', 'summary']),
    );
  });

  it.each([
    ['title', undefined],
    ['title', null],
    ['title', ''],
    ['title', '   '],
    ['summary', undefined],
    ['summary', ''],
    ['summary', '   '],
  ])('rejects %s = %j as invalid', (field, value) => {
    const payload = {
      title: 'Valid title',
      severity: 'SEV1',
      components: ['api'],
      summary: 'Valid summary',
      [field]: value,
    };
    expect(validateIncident(payload)).toContain(field);
  });

  it('rejects a missing severity', () => {
    const payload = { title: 'Valid title', components: ['api'], summary: 'Valid summary' };
    expect(validateIncident(payload)).toContain('severity');
  });

  it('rejects a severity value outside the SEV1/SEV2/SEV3 enum', () => {
    const payload = {
      title: 'Valid title',
      severity: 'CRITICAL',
      components: ['api'],
      summary: 'Valid summary',
    };
    expect(validateIncident(payload)).toContain('severity');
  });

  it('rejects an empty affected_components array', () => {
    const payload = {
      title: 'Valid title',
      severity: 'SEV1',
      components: [],
      summary: 'Valid summary',
    };
    expect(validateIncident(payload)).toContain('components');
  });

  it('rejects an affected_components array containing only blank strings', () => {
    const payload = {
      title: 'Valid title',
      severity: 'SEV1',
      components: ['   ', ''],
      summary: 'Valid summary',
    };
    expect(validateIncident(payload)).toContain('components');
  });

  it('accepts a non-empty string as affected_components', () => {
    const payload = {
      title: 'Valid title',
      severity: 'SEV1',
      components: 'api',
      summary: 'Valid summary',
    };
    expect(validateIncident(payload)).toEqual([]);
  });

  it('rejects a missing affected_components field entirely', () => {
    const payload = { title: 'Valid title', severity: 'SEV1', summary: 'Valid summary' };
    expect(validateIncident(payload)).toContain('components');
  });

  it('defaults to an empty payload when called with no arguments, flagging all fields', () => {
    expect(validateIncident()).toEqual(
      expect.arrayContaining(['title', 'severity', 'components', 'summary']),
    );
  });
});
