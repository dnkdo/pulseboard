import { describe, it, expect } from 'vitest';
import { groupComponentsByCategory } from './groupComponentsByCategory.js';

describe('groupComponentsByCategory (publicStatusPage contract path)', () => {
  it('groups components into one array per distinct category, in first-seen order, satisfying AC1', () => {
    const components = [
      { id: 1, name: 'API Server', category: 'API' },
      { id: 2, name: 'MySQL', category: 'Database' },
      { id: 3, name: 'API Gateway', category: 'API' },
      { id: 4, name: 'Web Frontend', category: 'Frontend' },
    ];

    expect(groupComponentsByCategory(components)).toEqual({
      API: [
        { id: 1, name: 'API Server', category: 'API' },
        { id: 3, name: 'API Gateway', category: 'API' },
      ],
      Database: [{ id: 2, name: 'MySQL', category: 'Database' }],
      Frontend: [{ id: 4, name: 'Web Frontend', category: 'Frontend' }],
    });
  });
});
