// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import { IncidentForm, isFormValid } from '../../src/components/IncidentForm.jsx';

afterEach(cleanup);

const COMPONENTS = [
  { id: 'comp-api', name: 'Core API' },
  { id: 'comp-db', name: 'Primary Database' },
];

const VALID_VALUES = {
  title: 'API latency spike',
  severity: 'SEV2',
  affectedComponents: ['comp-api'],
  summary: 'Elevated p99 latency on the core API.',
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('isFormValid', () => {
  it('rejects when every required field is empty', () => {
    expect(isFormValid({ title: '', severity: '', affectedComponents: [], summary: '' })).toBe(false);
  });

  it('rejects when only title is empty', () => {
    expect(isFormValid({ ...VALID_VALUES, title: '' })).toBe(false);
  });

  it('rejects when only severity is empty', () => {
    expect(isFormValid({ ...VALID_VALUES, severity: '' })).toBe(false);
  });

  it('rejects an unrecognized severity value', () => {
    expect(isFormValid({ ...VALID_VALUES, severity: 'CRITICAL' })).toBe(false);
  });

  it('rejects when affectedComponents is empty', () => {
    expect(isFormValid({ ...VALID_VALUES, affectedComponents: [] })).toBe(false);
  });

  it('rejects when only summary is empty', () => {
    expect(isFormValid({ ...VALID_VALUES, summary: '' })).toBe(false);
  });

  it('rejects whitespace-only title as empty', () => {
    expect(isFormValid({ ...VALID_VALUES, title: '   ' })).toBe(false);
  });

  it('rejects whitespace-only summary as empty', () => {
    expect(isFormValid({ ...VALID_VALUES, summary: '   \n\t  ' })).toBe(false);
  });

  it('rejects a summary longer than the 2000-character maximum', () => {
    expect(isFormValid({ ...VALID_VALUES, summary: 'x'.repeat(2001) })).toBe(false);
  });

  it('accepts a fully valid payload', () => {
    expect(isFormValid(VALID_VALUES)).toBe(true);
  });

  it('accepts a summary at exactly the 2000-character maximum', () => {
    expect(isFormValid({ ...VALID_VALUES, summary: 'x'.repeat(2000) })).toBe(true);
  });

  // Deterministic test-contract case: empty title alone must fail validation,
  // regardless of what the other fields contain.
  it('rejects the contract payload with an empty title', () => {
    expect(
      isFormValid({
        title: '',
        severity: 'critical',
        affectedComponents: ['database'],
        summary: 'Database service unavailable',
      })
    ).toBe(false);
  });

  // .adlc/testcases.yaml contract cases use a "components" key rather than
  // the form's own "affectedComponents" state field — isFormValid must
  // accept either.
  it('rejects the contract payload keyed by "components" when title is empty', () => {
    expect(isFormValid({ title: '', severity: 'SEV1', components: ['api'], summary: 'x' })).toBe(false);
  });

  it('accepts the contract payload keyed by "components" when fully valid', () => {
    expect(
      isFormValid({ title: 'DB outage', severity: 'SEV1', components: ['db'], summary: 'Primary DB unreachable' })
    ).toBe(true);
  });
});

function fillValidForm() {
  fireEvent.change(screen.getByTestId('incident-title-input'), {
    target: { value: VALID_VALUES.title },
  });
  fireEvent.change(screen.getByTestId('incident-severity-select'), {
    target: { value: VALID_VALUES.severity },
  });
  fireEvent.click(
    within(screen.getByTestId('incident-component-option-comp-api')).getByRole('checkbox')
  );
  fireEvent.change(screen.getByTestId('incident-summary-input'), {
    target: { value: VALID_VALUES.summary },
  });
}

describe('IncidentForm', () => {
  it('disables the submit button while the form is empty', () => {
    render(<IncidentForm components={COMPONENTS} />);
    expect(screen.getByTestId('incident-submit-button').disabled).toBe(true);
  });

  it('keeps the submit button disabled until every required field is valid, then enables it', () => {
    render(<IncidentForm components={COMPONENTS} />);
    const submitButton = screen.getByTestId('incident-submit-button');

    fireEvent.change(screen.getByTestId('incident-title-input'), { target: { value: VALID_VALUES.title } });
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('incident-severity-select'), {
      target: { value: VALID_VALUES.severity },
    });
    expect(submitButton.disabled).toBe(true);

    fireEvent.click(
      within(screen.getByTestId('incident-component-option-comp-api')).getByRole('checkbox')
    );
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('incident-summary-input'), {
      target: { value: VALID_VALUES.summary },
    });
    expect(submitButton.disabled).toBe(false);
  });

  it('re-disables the submit button if a previously valid field is cleared', () => {
    render(<IncidentForm components={COMPONENTS} />);
    fillValidForm();
    expect(screen.getByTestId('incident-submit-button').disabled).toBe(false);

    fireEvent.change(screen.getByTestId('incident-title-input'), { target: { value: '' } });
    expect(screen.getByTestId('incident-submit-button').disabled).toBe(true);
  });

  it('shows no inline error before a field has been touched', () => {
    render(<IncidentForm components={COMPONENTS} />);
    expect(screen.queryByTestId('incident-title-error')).toBeNull();
  });

  it('shows an inline error under a field left empty on blur', () => {
    render(<IncidentForm components={COMPONENTS} />);
    fireEvent.blur(screen.getByTestId('incident-title-input'));
    expect(screen.getByTestId('incident-title-error').textContent).toMatch(/title is required/i);
  });

  it.each([
    ['incident-severity-select', 'incident-severity-error', /severity is required/i],
    ['incident-summary-input', 'incident-summary-error', /summary is required/i],
  ])('shows an inline error for %s left empty on blur', (fieldTestId, errorTestId, messagePattern) => {
    render(<IncidentForm components={COMPONENTS} />);
    fireEvent.blur(screen.getByTestId(fieldTestId));
    expect(screen.getByTestId(errorTestId).textContent).toMatch(messagePattern);
  });

  it('shows an inline error for the affected-components group when blurred with none selected', () => {
    render(<IncidentForm components={COMPONENTS} />);
    const checkbox = within(screen.getByTestId('incident-component-option-comp-api')).getByRole('checkbox');
    fireEvent.blur(checkbox);
    expect(screen.getByTestId('incident-components-error').textContent).toMatch(/select at least one/i);
  });

  it('supports deselecting a previously checked component', () => {
    render(<IncidentForm components={COMPONENTS} />);
    const checkbox = within(screen.getByTestId('incident-component-option-comp-api')).getByRole('checkbox');

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('clears the inline error once a blurred field becomes valid', () => {
    render(<IncidentForm components={COMPONENTS} />);
    const titleInput = screen.getByTestId('incident-title-input');

    fireEvent.blur(titleInput);
    expect(screen.getByTestId('incident-title-error')).toBeTruthy();

    fireEvent.change(titleInput, { target: { value: 'API outage' } });
    expect(screen.queryByTestId('incident-title-error')).toBeNull();
  });

  it('shows no error for a field that has never been touched, even if invalid', () => {
    render(<IncidentForm components={COMPONENTS} />);
    fireEvent.blur(screen.getByTestId('incident-title-input'));
    // title is touched, severity/components/summary are not
    expect(screen.queryByTestId('incident-severity-error')).toBeNull();
    expect(screen.queryByTestId('incident-components-error')).toBeNull();
    expect(screen.queryByTestId('incident-summary-error')).toBeNull();
  });

  it('surfaces every field error at once on a submit attempt, even with the button disabled', () => {
    const createIncidentImpl = vi.fn();
    render(<IncidentForm components={COMPONENTS} createIncidentImpl={createIncidentImpl} />);

    expect(screen.getByTestId('incident-submit-button').disabled).toBe(true);

    // Simulates the native "Enter submits the form" path, which can reach
    // the submit handler even while the rendered button is disabled.
    fireEvent.submit(screen.getByTestId('incident-form'));

    expect(screen.getByTestId('incident-title-error')).toBeTruthy();
    expect(screen.getByTestId('incident-severity-error')).toBeTruthy();
    expect(screen.getByTestId('incident-components-error')).toBeTruthy();
    expect(screen.getByTestId('incident-summary-error')).toBeTruthy();
    expect(createIncidentImpl).not.toHaveBeenCalled();
  });

  it('calls the incident-creation API with the expected payload and resets the form on success', async () => {
    const created = { id: 'inc-99', ...VALID_VALUES };
    const createIncidentImpl = vi.fn().mockResolvedValue(created);
    const onSuccess = vi.fn();

    render(
      <IncidentForm components={COMPONENTS} createIncidentImpl={createIncidentImpl} onSuccess={onSuccess} />
    );

    fillValidForm();
    fireEvent.click(screen.getByTestId('incident-submit-button'));

    await waitFor(() => expect(createIncidentImpl).toHaveBeenCalledTimes(1));
    expect(createIncidentImpl).toHaveBeenCalledWith({
      title: VALID_VALUES.title,
      severity: VALID_VALUES.severity,
      affectedComponents: VALID_VALUES.affectedComponents,
      summary: VALID_VALUES.summary,
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created));

    expect(screen.getByTestId('incident-title-input').value).toBe('');
    expect(screen.getByTestId('incident-severity-select').value).toBe('');
    expect(
      within(screen.getByTestId('incident-component-option-comp-api')).getByRole('checkbox').checked
    ).toBe(false);
    expect(screen.getByTestId('incident-summary-input').value).toBe('');
    expect(screen.getByTestId('incident-submit-button').disabled).toBe(true);
  });

  it('trims leading/trailing whitespace from title and summary before submitting', async () => {
    const createIncidentImpl = vi.fn().mockResolvedValue({ id: 'inc-1' });
    render(<IncidentForm components={COMPONENTS} createIncidentImpl={createIncidentImpl} />);

    fireEvent.change(screen.getByTestId('incident-title-input'), {
      target: { value: `  ${VALID_VALUES.title}  ` },
    });
    fireEvent.change(screen.getByTestId('incident-severity-select'), {
      target: { value: VALID_VALUES.severity },
    });
    fireEvent.click(
      within(screen.getByTestId('incident-component-option-comp-api')).getByRole('checkbox')
    );
    fireEvent.change(screen.getByTestId('incident-summary-input'), {
      target: { value: `  ${VALID_VALUES.summary}  ` },
    });

    fireEvent.click(screen.getByTestId('incident-submit-button'));

    await waitFor(() => expect(createIncidentImpl).toHaveBeenCalledTimes(1));
    expect(createIncidentImpl.mock.calls[0][0].title).toBe(VALID_VALUES.title);
    expect(createIncidentImpl.mock.calls[0][0].summary).toBe(VALID_VALUES.summary);
  });

  it('shows a banner error and preserves entered values when the API call fails', async () => {
    const createIncidentImpl = vi.fn().mockRejectedValue(new Error('Network error while creating incident'));
    render(<IncidentForm components={COMPONENTS} createIncidentImpl={createIncidentImpl} />);

    fillValidForm();
    fireEvent.click(screen.getByTestId('incident-submit-button'));

    await waitFor(() => expect(screen.getByTestId('incident-form-error')).toBeTruthy());
    expect(screen.getByTestId('incident-form-error').textContent).toMatch(/network error/i);

    expect(screen.getByTestId('incident-title-input').value).toBe(VALID_VALUES.title);
    expect(screen.getByTestId('incident-summary-input').value).toBe(VALID_VALUES.summary);
    // The form is valid again (values preserved), so the user can retry.
    expect(screen.getByTestId('incident-submit-button').disabled).toBe(false);
  });

  it('disables the submit button and shows a pending label while a submission is in flight', async () => {
    const { promise, resolve } = deferred();
    const createIncidentImpl = vi.fn().mockReturnValue(promise);
    render(<IncidentForm components={COMPONENTS} createIncidentImpl={createIncidentImpl} />);

    fillValidForm();
    fireEvent.click(screen.getByTestId('incident-submit-button'));

    const submitButton = screen.getByTestId('incident-submit-button');
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toMatch(/declaring/i);

    resolve({ id: 'inc-1' });
    await waitFor(() => expect(screen.getByTestId('incident-submit-button').disabled).toBe(true));
  });

  it('does not call the API a second time for a submit attempt while one is already in flight', async () => {
    const { promise, resolve } = deferred();
    const createIncidentImpl = vi.fn().mockReturnValue(promise);
    render(<IncidentForm components={COMPONENTS} createIncidentImpl={createIncidentImpl} />);

    fillValidForm();
    fireEvent.submit(screen.getByTestId('incident-form'));
    fireEvent.submit(screen.getByTestId('incident-form'));

    expect(createIncidentImpl).toHaveBeenCalledTimes(1);
    resolve({ id: 'inc-1' });
    await waitFor(() => expect(screen.getByTestId('incident-submit-button').disabled).toBe(true));
  });

  it('renders a checkbox option per provided component and supports multi-selection', () => {
    render(<IncidentForm components={COMPONENTS} />);

    const apiCheckbox = within(screen.getByTestId('incident-component-option-comp-api')).getByRole(
      'checkbox'
    );
    const dbCheckbox = within(screen.getByTestId('incident-component-option-comp-db')).getByRole(
      'checkbox'
    );

    fireEvent.click(apiCheckbox);
    fireEvent.click(dbCheckbox);

    expect(apiCheckbox.checked).toBe(true);
    expect(dbCheckbox.checked).toBe(true);
  });
});
