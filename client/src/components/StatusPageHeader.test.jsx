// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import StatusPageHeader from './StatusPageHeader.jsx';

afterEach(() => {
  cleanup();
});

describe('StatusPageHeader', () => {
  it('renders the page title as an h1', () => {
    render(<StatusPageHeader />);
    expect(screen.getByRole('heading', { level: 1, name: 'Pulseboard Status' })).toBeInTheDocument();
  });

  it('renders a supporting tagline', () => {
    render(<StatusPageHeader />);
    expect(screen.getByText('Current system status and incident history.')).toBeInTheDocument();
  });

  it('renders no severity-colored elements (AC1: header is chrome only, never a severity indicator)', () => {
    render(<StatusPageHeader />);
    const header = screen.getByTestId('status-page-header');
    expect(header.querySelector('[data-severity]')).toBeNull();
    expect(header.querySelector('[data-testid*="severity"]')).toBeNull();
  });
});
