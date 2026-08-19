// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ExportMenu from '../ExportMenu.jsx';

afterEach(() => {
  cleanup();
});

describe('ExportMenu', () => {
  it('renders a closed menu with a CSV and a JSON option available once opened', () => {
    render(<ExportMenu onSelect={vi.fn()} />);

    expect(screen.queryByTestId('export-menu-list')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('export-menu-trigger'));

    expect(screen.getByTestId('export-menu-option-csv')).toHaveTextContent('Export as CSV');
    expect(screen.getByTestId('export-menu-option-json')).toHaveTextContent('Export as JSON');
  });

  it('opens the menu on Enter and on Space when the trigger is focused', () => {
    render(<ExportMenu onSelect={vi.fn()} />);
    const trigger = screen.getByTestId('export-menu-trigger');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByTestId('export-menu-list')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('export-menu-list')).not.toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByTestId('export-menu-list')).toBeInTheDocument();
  });

  it('closes the menu on Escape', () => {
    render(<ExportMenu onSelect={vi.fn()} />);
    fireEvent.click(screen.getByTestId('export-menu-trigger'));
    expect(screen.getByTestId('export-menu-list')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('export-menu'), { key: 'Escape' });

    expect(screen.queryByTestId('export-menu-list')).not.toBeInTheDocument();
  });

  it('calls onSelect with "csv" when the CSV option is clicked, and closes the menu', () => {
    const onSelect = vi.fn();
    render(<ExportMenu onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('export-menu-trigger'));

    fireEvent.click(screen.getByTestId('export-menu-option-csv'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('csv');
    expect(screen.queryByTestId('export-menu-list')).not.toBeInTheDocument();
  });

  it('calls onSelect with "json" when the JSON option is clicked', () => {
    const onSelect = vi.fn();
    render(<ExportMenu onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('export-menu-trigger'));

    fireEvent.click(screen.getByTestId('export-menu-option-json'));

    expect(onSelect).toHaveBeenCalledWith('json');
  });

  it('disables the trigger and shows a loading label while isExporting is true', () => {
    render(<ExportMenu onSelect={vi.fn()} isExporting />);
    const trigger = screen.getByTestId('export-menu-trigger');

    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('Exporting…');
  });

  it('renders an accessible error message when error is set', () => {
    render(<ExportMenu onSelect={vi.fn()} error="Export failed: 500" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Export failed: 500');
  });

  it('renders no error message when error is not set', () => {
    render(<ExportMenu onSelect={vi.fn()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
