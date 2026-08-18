// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { IncidentList } from '../../../src/components/dashboard/IncidentList.jsx';
import { IncidentFilterProvider } from '../../../src/state/IncidentFilterContext.jsx';
import { STATE_OPEN, STATE_RESOLVED } from '../../../src/theme/tokens.js';

afterEach(cleanup);

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

describe('IncidentList', () => {
  it('renders one row per incident with its title, componentId, and state-chip label', () => {
    render(
      <IncidentFilterProvider
        incidents={[
          { id: '1', title: 'API down', state: 'open', componentId: 'comp-api' },
          { id: '2', title: 'DB failover complete', state: 'resolved', componentId: 'comp-db' },
        ]}
      >
        <IncidentList />
      </IncidentFilterProvider>
    );

    const items = screen.getAllByTestId('incident-list-item');
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.dataset.componentId)).toEqual(['comp-api', 'comp-db']);
    expect(screen.getByText('API down')).toBeTruthy();
    expect(screen.getByText('DB failover complete')).toBeTruthy();

    const chips = screen.getAllByTestId('incident-list-state');
    expect(chips.map((chip) => chip.textContent)).toEqual(['Open', 'Resolved']);
    expect(chips[0].style.backgroundColor).toBe(hexToRgb(STATE_OPEN));
    expect(chips[1].style.backgroundColor).toBe(hexToRgb(STATE_RESOLVED));
  });

  it('renders the empty state when the filtered incident list is empty', () => {
    render(
      <IncidentFilterProvider incidents={[]}>
        <IncidentList />
      </IncidentFilterProvider>
    );

    expect(screen.getByTestId('incident-list-empty')).toBeTruthy();
    expect(screen.queryAllByTestId('incident-list-item')).toHaveLength(0);
  });

  it('throws instead of silently mislabeling when an incident has an unrecognized state (mirrors getStateChipProps)', () => {
    const renderBadState = () =>
      render(
        <IncidentFilterProvider incidents={[{ id: '1', title: 'Weird one', state: 'not-a-real-state' }]}>
          <IncidentList />
        </IncidentFilterProvider>
      );

    expect(renderBadState).toThrow(/unknown state/i);
  });
});
