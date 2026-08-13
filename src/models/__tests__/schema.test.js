import { describe, it, expect } from 'vitest';
import { SEVERITIES, INCIDENT_STATES } from '../schema.js';

describe('SEVERITIES', () => {
  it('contains exactly the 3 documented severities', () => {
    expect(SEVERITIES).toEqual(['SEV1', 'SEV2', 'SEV3']);
    expect(SEVERITIES).toHaveLength(3);
  });

  it('is frozen and rejects mutation', () => {
    expect(Object.isFrozen(SEVERITIES)).toBe(true);
    expect(() => {
      SEVERITIES.push('SEV4');
    }).toThrow(TypeError);
    expect(SEVERITIES).toEqual(['SEV1', 'SEV2', 'SEV3']);
  });
});

describe('INCIDENT_STATES', () => {
  it('contains exactly the 4 documented states in workflow order', () => {
    expect(INCIDENT_STATES).toEqual(['open', 'investigating', 'identified', 'resolved']);
    expect(INCIDENT_STATES).toHaveLength(4);
  });

  it('is not alphabetically sorted (order is the workflow sequence)', () => {
    const alphabetical = [...INCIDENT_STATES].sort();
    expect(INCIDENT_STATES).not.toEqual(alphabetical);
  });

  it('is frozen and rejects mutation', () => {
    expect(Object.isFrozen(INCIDENT_STATES)).toBe(true);
    expect(() => {
      INCIDENT_STATES.push('closed');
    }).toThrow(TypeError);
    expect(INCIDENT_STATES).toEqual(['open', 'investigating', 'identified', 'resolved']);
  });
});
