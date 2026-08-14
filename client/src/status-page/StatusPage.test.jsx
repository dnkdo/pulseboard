// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import StatusPage from './StatusPage.jsx';
import { fetchComponents } from '../lib/api/components.js';

vi.mock('../lib/api/components.js', () => ({
  fetchComponents: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StatusPage', () => {
  it('wires the component health grid in and renders its tiles', async () => {
    fetchComponents.mockResolvedValue([
      { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 100, incidents: [] },
    ]);

    render(<StatusPage />);

    expect(screen.getByRole('heading', { name: 'Component Status' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('API')).toBeInTheDocument());
  });
});
