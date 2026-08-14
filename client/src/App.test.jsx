import { describe, it, expect } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

describe('client vitest environment', () => {
  it('exposes a real DOM (document/window) because the test environment is jsdom, not node', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(window.HTMLElement);
  });

  it('mounts the App component and renders its text into the DOM', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<App />);
    });

    expect(container.textContent).toBe('Pulseboard');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
