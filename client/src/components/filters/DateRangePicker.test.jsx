// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DateRangePicker from './DateRangePicker.jsx';

afterEach(() => {
  cleanup();
});

describe('DateRangePicker', () => {
  it('reflects the controlled startDate/endDate props', () => {
    render(<DateRangePicker startDate="2026-08-01" endDate="2026-08-10" onChange={vi.fn()} />);

    expect(screen.getByTestId('date-range-start')).toHaveValue('2026-08-01');
    expect(screen.getByTestId('date-range-end')).toHaveValue('2026-08-10');
  });

  it('fires onChange with the full {startDate, endDate} pair when startDate changes', () => {
    const onChange = vi.fn();
    render(<DateRangePicker startDate="" endDate="2026-08-10" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-01' } });

    expect(onChange).toHaveBeenCalledWith({ startDate: '2026-08-01', endDate: '2026-08-10' });
  });

  it('fires onChange with the full {startDate, endDate} pair when endDate changes', () => {
    const onChange = vi.fn();
    render(<DateRangePicker startDate="2026-08-01" endDate="" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('date-range-end'), { target: { value: '2026-08-10' } });

    expect(onChange).toHaveBeenCalledWith({ startDate: '2026-08-01', endDate: '2026-08-10' });
  });

  it('AC: rejects a startDate after endDate — shows an error and does not call onChange', () => {
    const onChange = vi.fn();
    render(<DateRangePicker startDate="" endDate="2026-08-05" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-10' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('date-range-error')).toBeInTheDocument();
  });

  it('rejects an endDate before startDate — shows an error and does not call onChange', () => {
    const onChange = vi.fn();
    render(<DateRangePicker startDate="2026-08-10" endDate="" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('date-range-end'), { target: { value: '2026-08-01' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('date-range-error')).toBeInTheDocument();
  });

  it('clears a previously shown error once a valid edit is made', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DateRangePicker startDate="" endDate="2026-08-05" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-10' } });
    expect(screen.getByTestId('date-range-error')).toBeInTheDocument();

    rerender(<DateRangePicker startDate="" endDate="2026-08-20" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-10' } });

    expect(onChange).toHaveBeenCalledWith({ startDate: '2026-08-10', endDate: '2026-08-20' });
    expect(screen.queryByTestId('date-range-error')).not.toBeInTheDocument();
  });

  it('allows a startDate equal to endDate (boundary, not strictly less-than)', () => {
    const onChange = vi.fn();
    render(<DateRangePicker startDate="" endDate="2026-08-05" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-08-05' } });

    expect(onChange).toHaveBeenCalledWith({ startDate: '2026-08-05', endDate: '2026-08-05' });
    expect(screen.queryByTestId('date-range-error')).not.toBeInTheDocument();
  });
});
