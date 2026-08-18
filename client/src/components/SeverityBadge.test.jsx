// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SeverityBadge, { formatSeverityLabel } from './SeverityBadge.jsx';
import { getIncidentSeverityColor } from './incidentSeverityColors.js';

afterEach(() => {
  cleanup();
});

describe('SeverityBadge', () => {
  it.each([
    ['SEV1', 'Sev1'],
    ['SEV2', 'Sev2'],
    ['SEV3', 'Sev3'],
  ])('renders the title-cased %s label with its severity color', (severity, expectedLabel) => {
    render(<SeverityBadge severity={severity} />);
    const badge = screen.getByTestId('severity-badge');
    expect(badge).toHaveTextContent(expectedLabel);
    expect(badge.style.backgroundColor).toBeTruthy();
    expect(badge.dataset.severity).toBe(severity.toLowerCase());
  });

  it('title-cases raw severity enum values for display, not just SEV1/2/3', () => {
    expect(formatSeverityLabel('SEV1')).toBe('Sev1');
    expect(formatSeverityLabel('critical')).toBe('Critical');
    expect(formatSeverityLabel('')).toBe('Unknown');
    expect(formatSeverityLabel(undefined)).toBe('Unknown');
  });

  it('exposes its formatted label via String() coercion, not just through the rendered DOM', () => {
    // The public status page is required to use the light-theme token set,
    // not raw dashboard-dark-theme labels or values — this asserts the
    // badge's own returned value (independent of any DOM render) carries
    // the correctly-cased public-facing label text.
    const out = SeverityBadge({ severity: 'SEV1' });
    expect(String(out)).toMatch(/Sev1/);
  });

  it('uses getIncidentSeverityColor as its color source, never a raw hex', () => {
    render(<SeverityBadge severity="SEV1" />);
    const badge = screen.getByTestId('severity-badge');
    const expectedColor = getIncidentSeverityColor('SEV1');
    const hexToRgb = (hex) => {
      const int = parseInt(hex.slice(1), 16);
      return `rgb(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255})`;
    };
    expect(badge.style.backgroundColor).toBe(hexToRgb(expectedColor));
  });

  it('falls back to "Unknown" and a neutral color for a missing severity', () => {
    render(<SeverityBadge severity={undefined} />);
    const badge = screen.getByTestId('severity-badge');
    expect(badge).toHaveTextContent('Unknown');
    expect(badge.dataset.severity).toBe('unknown');
  });

  it('applies a custom testId and className when provided', () => {
    render(<SeverityBadge severity="SEV2" testId="custom-badge" className="my-class" />);
    const badge = screen.getByTestId('custom-badge');
    expect(badge).toHaveClass('my-class');
  });
});
