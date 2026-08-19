// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TransitionHistoryView, { TransitionHistory, EMPTY_MESSAGE } from './TransitionHistory.jsx';
import TransitionHistoryFromIndex, { TransitionHistory as TransitionHistoryFromIndexNamed } from './index.js';
import { formatTimestamp } from '../../utils/formatTimestamp.js';

afterEach(() => {
  cleanup();
});

const OUT_OF_ORDER_TRANSITIONS = [
  { state: 'resolved', label: 'Resolved', timestamp: '2026-08-18T10:00:00Z' },
  { state: 'investigating', label: 'Investigating', timestamp: '2026-08-18T08:00:00Z' },
  { state: 'acknowledged', label: 'Acknowledged', timestamp: '2026-08-18T09:00:00Z' },
];

describe('TransitionHistoryView (rendered component)', () => {
  it('renders one row per transition, with state label and formatted timestamp', () => {
    render(<TransitionHistoryView transitions={OUT_OF_ORDER_TRANSITIONS} />);

    const rows = screen.getAllByTestId('transition-history-row');
    expect(rows).toHaveLength(3);

    OUT_OF_ORDER_TRANSITIONS.forEach((transition, index) => {
      expect(rows[index]).toHaveTextContent(transition.label);
      expect(rows[index]).toHaveTextContent(formatTimestamp(transition.timestamp));
    });
  });

  it('falls back to the raw state value when no label is provided', () => {
    render(<TransitionHistoryView transitions={[{ state: 'identified', timestamp: '2026-08-18T09:30:00Z' }]} />);

    expect(screen.getByTestId('transition-history-state')).toHaveTextContent('identified');
  });

  it('renders "Unknown" when a transition has neither a label nor a state', () => {
    render(<TransitionHistoryView transitions={[{ timestamp: '2026-08-18T09:30:00Z' }]} />);

    expect(screen.getByTestId('transition-history-state')).toHaveTextContent('Unknown');
  });

  it('renders an empty-state message and no rows when given zero transitions', () => {
    render(<TransitionHistoryView transitions={[]} />);

    expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryAllByTestId('transition-history-row')).toHaveLength(0);
    expect(screen.queryByTestId('transition-history-list')).not.toBeInTheDocument();
  });

  it('preserves input order rather than re-sorting chronologically', () => {
    render(<TransitionHistoryView transitions={OUT_OF_ORDER_TRANSITIONS} />);

    const rows = screen.getAllByTestId('transition-history-row');
    const renderedLabels = rows.map(
      (row) => row.querySelector('[data-testid="transition-history-state"]').textContent
    );
    // Input is resolved -> investigating -> acknowledged, which is neither
    // chronological (investigating 08:00 comes first) nor alphabetical --
    // a re-sort of either kind would change this order.
    expect(renderedLabels).toEqual(['Resolved', 'Investigating', 'Acknowledged']);
  });

  it('renders duplicate transitions (same state and timestamp) as separate rows without deduping', () => {
    const duplicated = [
      { id: 'a', state: 'open', timestamp: '2026-08-18T08:00:00Z' },
      { id: 'b', state: 'open', timestamp: '2026-08-18T08:00:00Z' },
    ];
    render(<TransitionHistoryView transitions={duplicated} />);

    expect(screen.getAllByTestId('transition-history-row')).toHaveLength(2);
  });

  it('renders special characters in state labels as literal text, not markup', () => {
    render(
      <TransitionHistoryView
        transitions={[
          { id: 'x', state: '<script>alert(1)</script> & "quoted"', timestamp: '2026-08-18T10:00:00Z' },
        ]}
      />
    );

    const stateEl = screen.getByTestId('transition-history-state');
    expect(stateEl.textContent).toBe('<script>alert(1)</script> & "quoted"');
    expect(stateEl.querySelector('script')).toBeNull();
  });
});

describe('TransitionHistory (pure text export, called directly)', () => {
  it('returns a plain string (not a React element) so the value can be inspected directly', () => {
    const out = TransitionHistory({ transitions: OUT_OF_ORDER_TRANSITIONS });
    expect(typeof out).toBe('string');
  });

  it('includes one row of text per transition, with state label and formatted timestamp', () => {
    const out = TransitionHistory({
      transitions: [
        { id: '1', state: 'APPROVED', timestamp: '2026-08-18T10:30:00Z' },
        { id: '2', state: 'REJECTED', timestamp: '2026-08-18T14:15:00Z' },
      ],
    });

    expect(out).toContain('APPROVED');
    expect(out).toContain(formatTimestamp('2026-08-18T10:30:00Z'));
    expect(out).toContain('REJECTED');
    expect(out).toContain(formatTimestamp('2026-08-18T14:15:00Z'));
    expect(out.indexOf('APPROVED')).toBeLessThan(out.indexOf('REJECTED'));
  });

  it('returns the empty-state message when given zero transitions, instead of any row text', () => {
    const out = TransitionHistory({ transitions: [] });
    expect(out).toBe(EMPTY_MESSAGE);
    expect(out).not.toContain('|');
  });

  it('does not re-sort the input array -- output order tracks input order exactly', () => {
    const out = TransitionHistory({ transitions: OUT_OF_ORDER_TRANSITIONS });

    const resolvedIndex = out.indexOf('Resolved');
    const investigatingIndex = out.indexOf('Investigating');
    const acknowledgedIndex = out.indexOf('Acknowledged');

    expect(resolvedIndex).toBeGreaterThanOrEqual(0);
    expect(investigatingIndex).toBeGreaterThan(resolvedIndex);
    expect(acknowledgedIndex).toBeGreaterThan(investigatingIndex);
  });

  it('prefers `stateLabel` over a raw `state` value when both are present', () => {
    const out = TransitionHistory({
      transitions: [
        { state: 'resolved', stateLabel: 'Resolved', timestamp: '2026-08-19T10:00:00Z' },
        { state: 'investigating', stateLabel: 'Investigating', timestamp: '2026-08-19T09:00:00Z' },
        { state: 'acknowledged', stateLabel: 'Acknowledged', timestamp: '2026-08-19T08:00:00Z' },
      ],
    });

    expect(out).toMatch(/Resolved.*Investigating.*Acknowledged/);
  });

  it('uses `stateLabel` for transitions that carry no `state` field at all', () => {
    const out = TransitionHistory({
      transitions: [
        { stateLabel: 'Triggered', timestamp: '2024-01-15T10:30:00Z' },
        { stateLabel: 'Acknowledged', timestamp: '2024-01-15T11:00:00Z' },
        { stateLabel: 'Resolved', timestamp: '2024-01-15T12:00:00Z' },
      ],
    });

    expect(out).toContain('Triggered');
    expect(out).toContain('Acknowledged');
    expect(out).toContain('Resolved');
    expect(out).toContain('10:30');
    expect(out).toContain('11:00');
    expect(out).toContain('12:00');
  });

  it('reads timestamps from either a timestamp or occurredAt field', () => {
    const out = TransitionHistory({
      transitions: [
        { state: 'acknowledged', occurredAt: '2026-08-18T10:00:00Z', timestamp: '2026-08-18T10:00:00Z', id: 1 },
        { state: 'resolved', occurredAt: '2026-08-18T09:00:00Z', timestamp: '2026-08-18T09:00:00Z', id: 2 },
        { state: 'open', occurredAt: '2026-08-18T11:00:00Z', timestamp: '2026-08-18T11:00:00Z', id: 3 },
      ],
    });

    expect(out).toBe(
      'acknowledged 2026-Aug-18, 10:00 AM | resolved 2026-Aug-18, 9:00 AM | open 2026-Aug-18, 11:00 AM'
    );
  });
});

describe('TransitionHistory (via index.js)', () => {
  it('re-exports the same default component and preserves input order', () => {
    render(
      <TransitionHistoryFromIndex
        transitions={[
          { id: 'id-3', state: 'closed', timestamp: '2026-01-01T08:30:00Z' },
          { id: 'id-1', state: 'open', timestamp: '2026-01-03T08:30:00Z' },
          { id: 'id-2', state: 'pending', timestamp: '2026-01-02T08:30:00Z' },
        ]}
      />
    );

    const rows = screen.getAllByTestId('transition-history-row');
    expect(rows.map((row) => row.querySelector('[data-testid="transition-history-state"]').textContent)).toEqual([
      'closed',
      'open',
      'pending',
    ]);
  });

  it('renders the empty-state message when given zero transitions', () => {
    render(<TransitionHistoryFromIndex transitions={[]} />);

    expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument();
  });

  it('re-exports the same pure text function as the named export', () => {
    expect(TransitionHistoryFromIndexNamed({ transitions: [] })).toBe(EMPTY_MESSAGE);
  });
});
