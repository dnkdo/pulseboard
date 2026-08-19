// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CategorySection from './CategorySection.jsx';

afterEach(cleanup);

describe('CategorySection', () => {
  it('renders the category name as its section heading', () => {
    render(<CategorySection category="Infrastructure" components={[{ id: 'db', name: 'Primary Database' }]} />);

    expect(screen.getByRole('heading', { name: 'Infrastructure', level: 3 })).toBeInTheDocument();
  });

  it('renders exactly one tile per component, each appearing only once', () => {
    const components = [
      { id: 'db', name: 'Primary Database', healthState: 'operational', uptimePercent: 99.9 },
      { id: 'lb', name: 'Load Balancer', healthState: 'partial_outage', uptimePercent: 95.1 },
    ];

    render(<CategorySection category="Infrastructure" components={components} />);

    const section = screen.getByTestId('category-section');
    expect(within(section).getAllByText('Primary Database')).toHaveLength(1);
    expect(within(section).getAllByText('Load Balancer')).toHaveLength(1);
    expect(within(section).getAllByTestId('health-tile-dot')).toHaveLength(2);
  });

  it('tags the section with the category via data-category for downstream assertions', () => {
    render(<CategorySection category="Infrastructure" components={[{ id: 'db', name: 'Primary Database' }]} />);

    expect(screen.getByTestId('category-section')).toHaveAttribute('data-category', 'Infrastructure');
  });

  it('AC3: renders nothing at all for a category with zero components', () => {
    const { container } = render(<CategorySection category="Web" components={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('heading', { name: 'Web' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('category-section')).not.toBeInTheDocument();
  });

  it('AC3: the component itself returns null for an empty components array, not just an empty render', () => {
    expect(CategorySection({ category: 'Database', components: [] })).toBeNull();
  });
});
