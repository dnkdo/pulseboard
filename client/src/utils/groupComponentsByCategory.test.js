import { describe, it, expect } from 'vitest';
import { groupComponentsByCategory, UNCATEGORIZED } from './groupComponentsByCategory.js';

describe('groupComponentsByCategory', () => {
  it('groups a mixed list across all distinct categories present, one array per category', () => {
    const components = [
      { id: 'api', name: 'Core API', category: 'API' },
      { id: 'web', name: 'Public Status Page', category: 'Web' },
      { id: 'auth', name: 'Auth API', category: 'API' },
      { id: 'db', name: 'Primary Database', category: 'Infrastructure' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(Object.keys(grouped).sort()).toEqual(['API', 'Infrastructure', 'Web']);
    expect(grouped.API).toEqual([components[0], components[2]]);
    expect(grouped.Web).toEqual([components[1]]);
    expect(grouped.Infrastructure).toEqual([components[3]]);
  });

  it('produces no key at all for a category with zero matching components in the input', () => {
    const components = [
      { id: 'api', name: 'Core API', category: 'API' },
      { id: 'web', name: 'Public Status Page', category: 'Web' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(grouped).not.toHaveProperty('Infrastructure');
    expect(Object.keys(grouped)).toHaveLength(2);
  });

  it('places duplicate-category components together under one shared key, not one key per component', () => {
    const components = [
      { id: 'api', name: 'Core API', category: 'API' },
      { id: 'auth', name: 'Auth API', category: 'API' },
      { id: 'billing', name: 'Billing API', category: 'API' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(Object.keys(grouped)).toEqual(['API']);
    expect(grouped.API).toHaveLength(3);
  });

  it.each([
    ['missing', { id: 'x', name: 'Mystery Service' }],
    ['null', { id: 'x', name: 'Mystery Service', category: null }],
    ['empty string', { id: 'x', name: 'Mystery Service', category: '' }],
    ['whitespace-only', { id: 'x', name: 'Mystery Service', category: '   ' }],
  ])('falls back components with a %s category to the Uncategorized bucket', (_label, component) => {
    const grouped = groupComponentsByCategory([component]);

    expect(Object.keys(grouped)).toEqual([UNCATEGORIZED]);
    expect(grouped[UNCATEGORIZED]).toEqual([component]);
  });

  it('returns an empty object for an empty input array, producing no sections', () => {
    expect(groupComponentsByCategory([])).toEqual({});
  });

  it('preserves each category key in first-seen order, not alphabetical order', () => {
    const components = [
      { id: 'db', name: 'Primary Database', category: 'Infrastructure' },
      { id: 'api', name: 'Core API', category: 'API' },
      { id: 'web', name: 'Public Status Page', category: 'Web' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(Object.keys(grouped)).toEqual(['Infrastructure', 'API', 'Web']);
  });

  it('preserves each member component in its original relative order within a category', () => {
    const components = [
      { id: 'c', name: 'Third', category: 'API' },
      { id: 'a', name: 'First', category: 'API' },
      { id: 'b', name: 'Second', category: 'API' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(grouped.API.map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate or reorder the original input array', () => {
    const components = [
      { id: 'api', name: 'Core API', category: 'API' },
      { id: 'web', name: 'Public Status Page', category: 'Web' },
    ];
    const snapshot = [...components];

    groupComponentsByCategory(components);

    expect(components).toEqual(snapshot);
  });
});
