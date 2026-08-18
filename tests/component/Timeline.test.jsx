// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { Timeline } from '../../src/components/dashboard/Timeline.jsx';
import { SEV1_COLOR, SEV2_COLOR, SEV3_COLOR } from '../../src/theme/tokens.js';
import { IncidentFilterProvider } from '../../src/state/IncidentFilterContext.jsx';

afterEach(cleanup);

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

const UNORDERED_INCIDENTS = [
  { id: 'inc-b', title: 'Elevated latency', severity: 'SEV2', created_at: '2026-08-12T10:00:00Z' },
  { id: 'inc-a', title: 'Full outage', severity: 'SEV1', created_at: '2026-08-10T10:00:00Z' },
  { id: 'inc-c', title: 'Cosmetic banner glitch', severity: 'SEV3', created_at: '2026-08-14T10:00:00Z' },
];

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

describe('Timeline', () => {
  it('renders entries in chronological order (AC: buildIncidentTimeline sort applied)', () => {
    render(<Timeline incidents={UNORDERED_INCIDENTS} />);
    const entries = screen.getAllByTestId('timeline-entry');
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.dataset.severity)).toEqual(['SEV1', 'SEV2', 'SEV3']);
  });

  it("colors each entry's marker with getSeverityColor(severity) for that entry (AC: severity color placement)", () => {
    render(<Timeline incidents={UNORDERED_INCIDENTS} />);
    const markers = screen.getAllByTestId('timeline-marker');
    expect(markers.map((marker) => marker.style.backgroundColor)).toEqual([
      hexToRgb(SEV1_COLOR),
      hexToRgb(SEV2_COLOR),
      hexToRgb(SEV3_COLOR),
    ]);
  });

  it('applies the Figma-spec row padding and marker size for spacing consistency (AC: spacing)', () => {
    render(<Timeline incidents={UNORDERED_INCIDENTS} />);
    const [firstEntry] = screen.getAllByTestId('timeline-entry');
    expect(firstEntry.style.padding).toBe('12px 16px');

    const [firstMarker] = screen.getAllByTestId('timeline-marker');
    expect(firstMarker.style.width).toBe('12px');
    expect(firstMarker.style.height).toBe('12px');
  });

  it('applies the Figma-spec body-md typography to entry titles (AC: typography)', () => {
    render(<Timeline incidents={UNORDERED_INCIDENTS} />);
    const [firstTitle] = screen.getAllByText(/Full outage|Elevated latency|Cosmetic banner glitch/);
    expect(firstTitle.style.fontSize).toBe('14px');
    expect(firstTitle.style.fontWeight).toBe('400');
    expect(firstTitle.style.lineHeight).toBe('20px');
  });

  it('renders "Unknown time" for an incident with a missing/invalid timestamp instead of crashing', () => {
    render(<Timeline incidents={[{ id: 'x', title: 'No timestamp', severity: 'SEV2' }]} />);
    expect(screen.getByText('Unknown time')).toBeTruthy();
  });

  it('renders an empty state and no entries when given an empty incident list', () => {
    render(<Timeline incidents={[]} />);
    expect(screen.getByTestId('timeline-empty')).toBeTruthy();
    expect(screen.queryAllByTestId('timeline-entry')).toHaveLength(0);
  });

  it('falls back to the neutral marker color for an incident with an unknown severity', () => {
    render(<Timeline incidents={[{ id: 'x', title: 'Weird one', severity: 'UNKNOWN', created_at: '2026-08-10T10:00:00Z' }]} />);
    const [marker] = screen.getAllByTestId('timeline-marker');
    expect(marker.style.backgroundColor).not.toBe(hexToRgb(SEV1_COLOR));
    expect(marker.style.backgroundColor).not.toBe(hexToRgb(SEV2_COLOR));
    expect(marker.style.backgroundColor).not.toBe(hexToRgb(SEV3_COLOR));
  });

  it('fetches from GET /api/incidents and renders sorted results when no incidents prop is given', async () => {
    const fetchImpl = () => jsonResponse(UNORDERED_INCIDENTS);
    render(<Timeline fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getAllByTestId('timeline-entry')).toHaveLength(3));
    const entries = screen.getAllByTestId('timeline-entry');
    expect(entries.map((entry) => entry.dataset.severity)).toEqual(['SEV1', 'SEV2', 'SEV3']);
  });

  it('shows a loading state before the fetch resolves', () => {
    const fetchImpl = () => new Promise(() => {});
    render(<Timeline fetchImpl={fetchImpl} />);
    expect(screen.getByTestId('timeline-loading')).toBeTruthy();
  });

  it('shows an error state and no entries when the fetch fails', async () => {
    const fetchImpl = () => Promise.resolve({ ok: false, status: 500 });
    render(<Timeline fetchImpl={fetchImpl} />);
    await waitFor(() => expect(screen.getByTestId('timeline-error')).toBeTruthy());
    expect(screen.queryAllByTestId('timeline-entry')).toHaveLength(0);
  });

  it('reads incidents from IncidentFilterContext when no incidents prop is given', () => {
    render(
      <IncidentFilterProvider incidents={UNORDERED_INCIDENTS}>
        <Timeline />
      </IncidentFilterProvider>
    );

    const entries = screen.getAllByTestId('timeline-entry');
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.dataset.severity)).toEqual(['SEV1', 'SEV2', 'SEV3']);
  });

  it('an explicit incidents prop overrides the surrounding IncidentFilterContext', () => {
    const propIncidents = [{ id: 'prop-only', title: 'From prop', severity: 'SEV2', created_at: '2026-08-10T10:00:00Z' }];

    render(
      <IncidentFilterProvider incidents={UNORDERED_INCIDENTS}>
        <Timeline incidents={propIncidents} />
      </IncidentFilterProvider>
    );

    const entries = screen.getAllByTestId('timeline-entry');
    expect(entries).toHaveLength(1);
    expect(screen.getByText('From prop')).toBeTruthy();
  });
});
