import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { groupComponentsByCategory } from '../../server/utils/groupComponents.js';
import { loadComponents } from '../../server/models/component.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALLOWED_CATEGORIES = ['API', 'Web', 'Infrastructure'];

describe('groupComponentsByCategory', () => {
  it('groups a mixed list across all three categories into keys matching the distinct categories present', () => {
    const components = [
      { id: 1, name: 'Auth API', category: 'API' },
      { id: 2, name: 'Marketing Site', category: 'Web' },
      { id: 3, name: 'Payments API', category: 'API' },
      { id: 4, name: 'Primary DB', category: 'Infrastructure' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(Object.keys(grouped).sort()).toEqual(['API', 'Infrastructure', 'Web']);
  });

  it('places each component only in its own category array, preserving input order within the array', () => {
    const components = [
      { id: 1, name: 'Auth API', category: 'API' },
      { id: 2, name: 'Marketing Site', category: 'Web' },
      { id: 3, name: 'Payments API', category: 'API' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(grouped).toEqual({
      API: [
        { id: 1, name: 'Auth API', category: 'API' },
        { id: 3, name: 'Payments API', category: 'API' },
      ],
      Web: [{ id: 2, name: 'Marketing Site', category: 'Web' }],
    });
  });

  it('matches the contract fixture from .adlc/testcases.yaml exactly', () => {
    const components = [
      { id: 1, name: 'Auth API', category: 'API' },
      { id: 2, name: 'Marketing Site', category: 'Web' },
      { id: 3, name: 'Payments API', category: 'API' },
    ];

    expect(groupComponentsByCategory(components)).toEqual({
      API: [
        { id: 1, name: 'Auth API', category: 'API' },
        { id: 3, name: 'Payments API', category: 'API' },
      ],
      Web: [{ id: 2, name: 'Marketing Site', category: 'Web' }],
    });
  });

  it('returns an empty object for an empty input array', () => {
    expect(groupComponentsByCategory([])).toEqual({});
  });

  it('returns a single key holding every component when all share one category', () => {
    const components = [
      { id: 1, name: 'Core API', category: 'API' },
      { id: 2, name: 'Auth API', category: 'API' },
      { id: 3, name: 'Billing API', category: 'API' },
    ];

    expect(groupComponentsByCategory(components)).toEqual({
      API: components,
    });
  });

  it('treats category values as case-sensitive, never merging differently-cased strings', () => {
    const components = [
      { id: 1, name: 'Core API', category: 'API' },
      { id: 2, name: 'Lowercase api', category: 'api' },
    ];

    const grouped = groupComponentsByCategory(components);

    expect(Object.keys(grouped).sort()).toEqual(['API', 'api']);
    expect(grouped.API).toEqual([{ id: 1, name: 'Core API', category: 'API' }]);
    expect(grouped.api).toEqual([{ id: 2, name: 'Lowercase api', category: 'api' }]);
  });

  it('does not mutate or reorder the original input array', () => {
    const components = [
      { id: 1, name: 'Auth API', category: 'API' },
      { id: 2, name: 'Marketing Site', category: 'Web' },
      { id: 3, name: 'Payments API', category: 'API' },
    ];
    const snapshot = [...components];

    groupComponentsByCategory(components);

    expect(components).toEqual(snapshot);
  });
});

describe('loadComponents', () => {
  it('returns the seed fixture parsed from server/data/components.json', () => {
    const fromDisk = JSON.parse(
      readFileSync(path.join(repoRoot, 'server', 'data', 'components.json'), 'utf-8')
    );

    expect(loadComponents()).toEqual(fromDisk);
  });

  it('returns a fresh array on each call rather than a shared mutable reference', () => {
    const first = loadComponents();
    first.push({ id: 'injected', name: 'Injected', category: 'API' });

    const second = loadComponents();

    expect(second).not.toEqual(first);
    expect(second.find((component) => component.id === 'injected')).toBeUndefined();
  });
});

describe('seed component data', () => {
  const components = loadComponents();

  it('is a non-empty array of seed components', () => {
    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThan(0);
  });

  it.each(loadComponents().map((component) => [component.id, component]))(
    'component %s has a non-empty category value that is one of API/Web/Infrastructure',
    (_id, component) => {
      expect(typeof component.category).toBe('string');
      expect(component.category.trim().length).toBeGreaterThan(0);
      expect(ALLOWED_CATEGORIES).toContain(component.category);
    }
  );

  it('covers every allowed category at least once so grouping is exercised end-to-end', () => {
    const grouped = groupComponentsByCategory(components);
    expect(Object.keys(grouped).sort()).toEqual([...ALLOWED_CATEGORIES].sort());
  });
});
