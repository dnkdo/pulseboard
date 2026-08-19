// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import IncidentCard, { onCardClick } from './IncidentCard.jsx';
import cardStyles from './IncidentCard.module.css';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

afterEach(() => {
  cleanup();
  mockNavigate.mockClear();
});

function renderCard(incident) {
  return render(
    <MemoryRouter>
      <IncidentCard incident={incident} />
    </MemoryRouter>,
  );
}

describe('onCardClick (isolated handler)', () => {
  it('navigates to the /status/incidents/:id route for the given incident id', () => {
    const navigate = vi.fn();
    onCardClick(navigate, 'inc-42');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/status/incidents/inc-42');
  });
});

describe('IncidentCard click-through navigation (PLB-99)', () => {
  it('navigates to /status/incidents/:id matching the clicked card incident id', () => {
    renderCard({ id: 'inc-1', title: 'API Down', status: 'open', severity: 'SEV1' });

    fireEvent.click(screen.getByTestId('incident-card'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/status/incidents/inc-1');
  });

  it('navigates each distinct card to its own matching incident id, not a shared/stale one', () => {
    const incidents = [
      { id: 'inc-alpha', title: 'Alpha Outage', status: 'open', severity: 'SEV1' },
      { id: 'inc-beta', title: 'Beta Outage', status: 'investigating', severity: 'SEV2' },
      { id: 'inc-gamma', title: 'Gamma Outage', status: 'identified', severity: 'SEV3' },
    ];

    incidents.forEach((incident) => {
      cleanup();
      mockNavigate.mockClear();
      renderCard(incident);

      fireEvent.click(screen.getByTestId('incident-card'));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(`/status/incidents/${incident.id}`);
    });
  });

  it('navigates on Enter key press for keyboard accessibility', () => {
    renderCard({ id: 'inc-9', title: 'Keyboard Enter', status: 'open', severity: 'SEV2' });

    fireEvent.keyDown(screen.getByTestId('incident-card'), { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/status/incidents/inc-9');
  });

  it('navigates on Space key press for keyboard accessibility', () => {
    renderCard({ id: 'inc-10', title: 'Keyboard Space', status: 'open', severity: 'SEV2' });

    fireEvent.keyDown(screen.getByTestId('incident-card'), { key: ' ' });

    expect(mockNavigate).toHaveBeenCalledWith('/status/incidents/inc-10');
  });

  it('does not navigate on an unrelated key press', () => {
    renderCard({ id: 'inc-11', title: 'Ignore Tab', status: 'open', severity: 'SEV2' });

    fireEvent.keyDown(screen.getByTestId('incident-card'), { key: 'Tab' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('exposes button semantics and keyboard focusability without altering existing rendered content', () => {
    renderCard({
      id: 'inc-1',
      title: 'API Down',
      status: 'open',
      severity: 'SEV1',
      timestamp: '2026-01-01T00:00:00Z',
    });

    const card = screen.getByTestId('incident-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabIndex', '0');

    // Field visibility/content unchanged from the pre-navigation baseline.
    expect(screen.getByText('API Down')).toBeInTheDocument();
    expect(screen.getByTestId('incident-severity-badge')).toHaveTextContent('Sev1');
    expect(screen.getByTestId('incident-status-badge')).toHaveTextContent('Open');
    expect(screen.getByText(new Date('2026-01-01T00:00:00Z').toLocaleString())).toBeInTheDocument();
  });

  it('applies the original card class plus an additive clickable affordance class, not a replacement', () => {
    renderCard({ id: 'inc-1', title: 'API Down', status: 'open', severity: 'SEV1' });

    const card = screen.getByTestId('incident-card');
    const classList = card.className.split(' ');
    expect(classList).toContain(cardStyles.card);
    expect(classList).toContain(cardStyles.clickable);
  });
});
