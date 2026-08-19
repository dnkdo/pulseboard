// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SeverityDropdown from './SeverityDropdown.jsx';
import { SEVERITIES } from '../../models/schema.js';

afterEach(() => {
  cleanup();
});

describe('SeverityDropdown', () => {
  it('renders an "All severities" option plus one option per canonical SEVERITIES entry', () => {
    render(<SeverityDropdown value="" onChange={vi.fn()} />);

    const options = screen.getAllByRole('option').map((option) => option.value);
    expect(options).toEqual(['', ...SEVERITIES]);
  });

  it('reflects the controlled `value` prop rather than tracking its own state', () => {
    render(<SeverityDropdown value="SEV2" onChange={vi.fn()} />);

    expect(screen.getByTestId('severity-dropdown')).toHaveValue('SEV2');
  });

  it('fires onChange with the selected severity, and does not mutate its own value on interaction', () => {
    const onChange = vi.fn();
    render(<SeverityDropdown value="" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: 'SEV1' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('SEV1');
    // Still reflects the prop (unchanged by this render), proving the
    // component has no internal state duplicating the selection.
    expect(screen.getByTestId('severity-dropdown')).toHaveValue('');
  });

  it('fires onChange with an empty string when "All severities" is selected', () => {
    const onChange = vi.fn();
    render(<SeverityDropdown value="SEV3" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });
});
