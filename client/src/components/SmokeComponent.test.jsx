import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SmokeComponent from './SmokeComponent.jsx';

afterEach(cleanup);

describe('SmokeComponent (client build health smoke test)', () => {
  it('mounts and renders its content into the DOM without throwing', () => {
    render(<SmokeComponent />);

    expect(screen.getByTestId('smoke-component')).toBeInTheDocument();
    expect(screen.getByText('Pulseboard client build is healthy')).toBeInTheDocument();
  });
});
