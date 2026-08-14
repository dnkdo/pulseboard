import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

vi.mock('./lib/api/components.js', () => ({
  fetchComponents: vi.fn().mockResolvedValue([]),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('client vitest environment', () => {
  it('exposes a real DOM (document/window) because the test environment is jsdom, not node', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(window.HTMLElement);
  });

  it('mounts the App component and renders the status page into the DOM', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Pulseboard');
    expect(container.textContent).toContain('Component Status');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
