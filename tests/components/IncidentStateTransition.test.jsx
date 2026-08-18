// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { IncidentStateTransition } from '../../src/components/IncidentStateTransition.jsx';

afterEach(cleanup);

describe('IncidentStateTransition', () => {
  it('renders exactly one advance action matching the sequential next state for a non-resolved incident', () => {
    render(<IncidentStateTransition incident={{ id: 'inc-1', state: 'open' }} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe('Mark as Investigating');
  });

  it('advances the label as the incident moves through the sequence', () => {
    const { rerender } = render(<IncidentStateTransition incident={{ id: 'inc-1', state: 'investigating' }} />);
    expect(screen.getByRole('button').textContent).toBe('Mark as Identified');

    rerender(<IncidentStateTransition incident={{ id: 'inc-1', state: 'identified' }} />);
    expect(screen.getByRole('button').textContent).toBe('Mark as Resolved');
  });

  it('exposes no state-changing action once an incident is resolved', () => {
    render(<IncidentStateTransition incident={{ id: 'inc-1', state: 'resolved' }} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('incident-state-transition-button')).toBeNull();
  });

  it('renders no action for an unrecognized terminal/unknown state', () => {
    render(<IncidentStateTransition incident={{ id: 'inc-1', state: 'archived' }} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls the transition API with the incident id and the derived next state on click', async () => {
    const postIncidentTransitionImpl = vi.fn().mockResolvedValue({ id: 'inc-1', state: 'investigating' });
    const onTransitioned = vi.fn();

    render(
      <IncidentStateTransition
        incident={{ id: 'inc-1', state: 'open' }}
        postIncidentTransitionImpl={postIncidentTransitionImpl}
        onTransitioned={onTransitioned}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(onTransitioned).toHaveBeenCalledWith({ id: 'inc-1', state: 'investigating' }));
    expect(postIncidentTransitionImpl).toHaveBeenCalledWith('inc-1', 'investigating');
  });

  it('surfaces an API rejection as an inline error without corrupting the rendered incident state', async () => {
    const postIncidentTransitionImpl = vi
      .fn()
      .mockRejectedValue(new Error("Cannot transition incident from 'open' to 'investigating'"));

    render(
      <IncidentStateTransition
        incident={{ id: 'inc-1', state: 'open' }}
        postIncidentTransitionImpl={postIncidentTransitionImpl}
      />,
    );

    const button = screen.getByRole('button');
    expect(button.textContent).toBe('Mark as Investigating');

    fireEvent.click(button);

    const errorBanner = await screen.findByTestId('incident-state-transition-error');
    expect(errorBanner.textContent).toBe("Cannot transition incident from 'open' to 'investigating'");

    // The component's derived view of the incident must remain exactly as
    // passed in — re-querying for the original next-state label proves the
    // failed transition never mutated local/incident state.
    expect(screen.getByRole('button').textContent).toBe('Mark as Investigating');
    expect(screen.getByRole('button').disabled).toBe(false);
  });

  it('falls back to a generic error message when the rejection has none', async () => {
    const postIncidentTransitionImpl = vi.fn().mockRejectedValue(new Error());

    render(
      <IncidentStateTransition
        incident={{ id: 'inc-1', state: 'open' }}
        postIncidentTransitionImpl={postIncidentTransitionImpl}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    const errorBanner = await screen.findByTestId('incident-state-transition-error');
    expect(errorBanner.textContent).toMatch(/failed to transition incident/i);
  });

  it('disables the button and shows an updating label while the request is in flight', async () => {
    let resolveTransition;
    const postIncidentTransitionImpl = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveTransition = resolve;
        }),
    );

    render(
      <IncidentStateTransition
        incident={{ id: 'inc-1', state: 'open' }}
        postIncidentTransitionImpl={postIncidentTransitionImpl}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button').disabled).toBe(true);
    expect(screen.getByRole('button').textContent).toBe('Updating…');

    resolveTransition({ id: 'inc-1', state: 'investigating' });
    await waitFor(() => expect(screen.getByRole('button').disabled).toBe(false));
  });

  it('falls back to incident.status when incident.state is absent', () => {
    render(<IncidentStateTransition incident={{ id: 'inc-1', status: 'identified' }} />);

    expect(screen.getByRole('button').textContent).toBe('Mark as Resolved');
  });

  it('does not warn or throw when a successful response resolves after the component unmounts', async () => {
    let resolveTransition;
    const postIncidentTransitionImpl = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveTransition = resolve;
        }),
    );
    const onTransitioned = vi.fn();

    const { unmount } = render(
      <IncidentStateTransition
        incident={{ id: 'inc-1', state: 'open' }}
        postIncidentTransitionImpl={postIncidentTransitionImpl}
        onTransitioned={onTransitioned}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    unmount();
    resolveTransition({ id: 'inc-1', state: 'investigating' });
    await Promise.resolve();

    expect(onTransitioned).not.toHaveBeenCalled();
  });

  it('does not surface an error banner when a rejected request resolves after the component unmounts', async () => {
    let rejectTransition;
    const postIncidentTransitionImpl = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectTransition = reject;
        }),
    );

    const { unmount, container } = render(
      <IncidentStateTransition
        incident={{ id: 'inc-1', state: 'open' }}
        postIncidentTransitionImpl={postIncidentTransitionImpl}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    unmount();
    rejectTransition(new Error('boom'));
    await Promise.resolve().then(() => Promise.resolve());

    expect(container.querySelector('[data-testid="incident-state-transition-error"]')).toBeNull();
  });
});
