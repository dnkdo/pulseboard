// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TimelineFilterBar from './TimelineFilterBar.jsx';

afterEach(() => {
  cleanup();
});

function renderBar(overrides = {}) {
  const props = {
    severity: '',
    startDate: '',
    endDate: '',
    onSeverityChange: vi.fn(),
    onDateRangeChange: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<TimelineFilterBar {...props} />);
  return props;
}

describe('TimelineFilterBar', () => {
  it('renders the severity dropdown and date-range inputs composed together', () => {
    renderBar();

    expect(screen.getByTestId('severity-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-start')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-end')).toBeInTheDocument();
  });

  it('forwards a severity selection to onSeverityChange, holding no state of its own', () => {
    const { onSeverityChange } = renderBar();

    fireEvent.change(screen.getByTestId('severity-dropdown'), { target: { value: 'SEV2' } });

    expect(onSeverityChange).toHaveBeenCalledWith('SEV2');
  });

  it('forwards a date-range edit to onDateRangeChange', () => {
    const { onDateRangeChange } = renderBar({ endDate: '2026-08-10' });

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-01' } });

    expect(onDateRangeChange).toHaveBeenCalledWith({ startDate: '2026-08-01', endDate: '2026-08-10' });
  });

  it('disables the Clear button when no filters are active', () => {
    renderBar({ severity: '', startDate: '', endDate: '' });

    expect(screen.getByTestId('clear-filters-button')).toBeDisabled();
  });

  it('enables the Clear button once any filter is active, and calls onClear when clicked', () => {
    const { onClear } = renderBar({ severity: 'SEV1' });

    const button = screen.getByTestId('clear-filters-button');
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
