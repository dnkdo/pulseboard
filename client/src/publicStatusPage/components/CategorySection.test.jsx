// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import CategorySection from './CategorySection.jsx';

describe('CategorySection (publicStatusPage contract path)', () => {
  it('returns null for a category with zero components, so no empty section renders, satisfying AC3', () => {
    expect(CategorySection({ category: 'Database', components: [] })).toBeNull();
  });
});
