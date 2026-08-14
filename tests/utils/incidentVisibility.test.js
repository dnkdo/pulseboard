import { describe, it, expect } from 'vitest';
import { filterPublicIncidentFields } from '../../src/utils/incidentVisibility.js';

function buildFullIncident() {
  return {
    id: 'inc-1',
    title: 'API Latency Spike',
    status: 'investigating',
    severity: 'SEV2',
    internalNotes: 'escalate to DB team',
    assignee: 'dana',
    affectedComponents: ['API'],
    transitions: [
      { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
      { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
    ],
    publicUpdate: 'We are investigating elevated API latency.',
  };
}

describe('filterPublicIncidentFields', () => {
  it('preserves id, title, status, severity, affectedComponents, transitions, and publicUpdate', () => {
    const incident = buildFullIncident();
    const result = filterPublicIncidentFields(incident);

    expect(result.id).toBe(incident.id);
    expect(result.title).toBe(incident.title);
    expect(result.status).toBe(incident.status);
    expect(result.severity).toBe(incident.severity);
    expect(result.affectedComponents).toEqual(incident.affectedComponents);
    expect(result.transitions).toEqual(incident.transitions);
    expect(result.publicUpdate).toBe(incident.publicUpdate);
  });

  it('matches the .adlc test-contract case exactly', () => {
    const incident = buildFullIncident();

    expect(filterPublicIncidentFields(incident)).toEqual({
      id: 'inc-1',
      title: 'API Latency Spike',
      status: 'investigating',
      severity: 'SEV2',
      affectedComponents: ['API'],
      transitions: [
        { state: 'open', timestamp: '2026-08-13T10:00:00Z' },
        { state: 'investigating', timestamp: '2026-08-13T10:15:00Z' },
      ],
      publicUpdate: 'We are investigating elevated API latency.',
    });
  });

  it('omits internalNotes and assignee as own properties, not just undefined values', () => {
    const result = filterPublicIncidentFields(buildFullIncident());

    expect(Object.prototype.hasOwnProperty.call(result, 'internalNotes')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'assignee')).toBe(false);
    expect(Object.keys(result).sort()).toEqual(
      [
        'affectedComponents',
        'id',
        'publicUpdate',
        'severity',
        'status',
        'title',
        'transitions',
      ].sort(),
    );
  });

  it('does not mutate the input object', () => {
    const incident = buildFullIncident();
    const clone = JSON.parse(JSON.stringify(incident));

    const result = filterPublicIncidentFields(incident);

    expect(incident).toEqual(clone);
    expect(result).not.toBe(incident);
  });

  it('returns null when given null', () => {
    expect(filterPublicIncidentFields(null)).toBeNull();
  });

  it('returns undefined when given undefined', () => {
    expect(filterPublicIncidentFields(undefined)).toBeUndefined();
  });

  it('does not throw and returns undefined for missing optional fields', () => {
    const incident = {
      id: 'inc-2',
      title: 'Minor blip',
      status: 'open',
      severity: 'SEV3',
      affectedComponents: [],
      transitions: [],
      // no publicUpdate provided
    };

    let result;
    expect(() => {
      result = filterPublicIncidentFields(incident);
    }).not.toThrow();

    expect(result.publicUpdate).toBeUndefined();
    expect(result.id).toBe('inc-2');
  });
});
