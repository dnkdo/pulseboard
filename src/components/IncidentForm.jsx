import { useState } from 'react';
import { SEVERITIES } from '../models/schema.js';
import { validateIncident } from '../lib/validateIncident.js';
import { createIncident } from '../api/incidents.js';
import seedComponents from '../data/seed/components.json';
import {
  formContainerStyle,
  fieldGroupStyle,
  labelStyle,
  requiredMarkStyle,
  controlStyle,
  multiSelectStyle,
  checkboxLabelStyle,
  errorTextStyle,
  apiErrorBannerStyle,
  submitButtonStyle,
} from './IncidentForm.styles.js';

// Seed data (src/data/seed/components.json) is the same deterministic
// fixture the database boots from on a fresh install, so this reuses it
// as the default option list instead of inventing arbitrary components —
// callers that already have a live component list (e.g. from
// IncidentFilterContext) can override it via the `components` prop.
const DEFAULT_COMPONENTS = seedComponents.map((component) => ({
  id: component.id,
  name: component.name,
}));

const SUMMARY_MAX_LENGTH = 2000;

const INITIAL_VALUES = Object.freeze({
  title: '',
  severity: '',
  affectedComponents: [],
  summary: '',
});

const INITIAL_TOUCHED = Object.freeze({
  title: false,
  severity: false,
  affectedComponents: false,
  summary: false,
});

const FIELD_ERROR_MESSAGES = {
  title: 'Title is required.',
  severity: 'Severity is required.',
  components: 'Select at least one affected component.',
  summary: 'Summary is required.',
};

// validateIncident (src/lib/validateIncident.js) is the same pure validator
// the POST /api/incidents route runs server-side — reused here so
// client-side and server-side "what counts as a valid incident" never
// drift apart. It speaks in terms of a "components" field; the form's
// internal state calls the same value `affectedComponents`. Accepts either
// key so isFormValid works both with the form's own state shape and with
// the "components"-keyed payload shape from the deterministic test
// contract (.adlc/testcases.yaml).
function toValidationPayload(values) {
  return {
    title: values?.title,
    severity: values?.severity,
    components: values?.components ?? values?.affectedComponents,
    summary: values?.summary,
  };
}

function isSummaryTooLong(values) {
  return typeof values?.summary === 'string' && values.summary.length > SUMMARY_MAX_LENGTH;
}

// Named export per the deterministic test contract (Phase 6 imports this
// exact function) — also reused internally as the submit button's disabled
// binding, so the button and the field-level errors below can never disagree
// about whether the form is valid.
export function isFormValid(values) {
  return validateIncident(toValidationPayload(values)).length === 0 && !isSummaryTooLong(values);
}

// Composes on top of validateIncident's invalid-field list rather than
// re-deriving its own rules, so isFormValid and the per-field messages
// shown on blur/submit can never fall out of sync.
function getFieldErrors(values) {
  const invalidFields = validateIncident(toValidationPayload(values));
  const errors = {};

  for (const field of invalidFields) {
    const key = field === 'components' ? 'affectedComponents' : field;
    errors[key] = FIELD_ERROR_MESSAGES[field];
  }

  if (!errors.summary && isSummaryTooLong(values)) {
    errors.summary = `Summary must be ${SUMMARY_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function IncidentForm({ components = DEFAULT_COMPONENTS, onSuccess, createIncidentImpl = createIncident }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState(INITIAL_TOUCHED);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const errors = getFieldErrors(values);
  const valid = isFormValid(values);

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleFieldChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleComponentToggle(componentId) {
    setValues((prev) => {
      const alreadySelected = prev.affectedComponents.includes(componentId);
      const affectedComponents = alreadySelected
        ? prev.affectedComponents.filter((id) => id !== componentId)
        : [...prev.affectedComponents, componentId];
      return { ...prev, affectedComponents };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Defense in depth: recompute and surface every field's error on a
    // submit attempt even though the button is already disabled unless
    // isFormValid(values) is true, so an invalid form can never sneak a
    // request through (e.g. a submit triggered by pressing Enter).
    setTouched({ title: true, severity: true, affectedComponents: true, summary: true });

    if (!isFormValid(values) || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createIncidentImpl({
        title: values.title.trim(),
        severity: values.severity,
        affectedComponents: values.affectedComponents,
        summary: values.summary.trim(),
      });
      setValues(INITIAL_VALUES);
      setTouched(INITIAL_TOUCHED);
      setSubmitting(false);
      onSuccess?.(created);
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err?.message || 'Failed to declare incident. Please try again.');
    }
  }

  return (
    <form data-testid="incident-form" onSubmit={handleSubmit} noValidate style={formContainerStyle}>
      {submitError && (
        <div data-testid="incident-form-error" role="alert" style={apiErrorBannerStyle}>
          {submitError}
        </div>
      )}

      <div style={fieldGroupStyle}>
        <label htmlFor="incident-title" style={labelStyle}>
          Title <span style={requiredMarkStyle}>*</span>
        </label>
        <input
          id="incident-title"
          data-testid="incident-title-input"
          type="text"
          value={values.title}
          onChange={(event) => handleFieldChange('title', event.target.value)}
          onBlur={() => handleBlur('title')}
          style={controlStyle(touched.title && Boolean(errors.title))}
        />
        {touched.title && errors.title && (
          <span data-testid="incident-title-error" style={errorTextStyle}>
            {errors.title}
          </span>
        )}
      </div>

      <div style={fieldGroupStyle}>
        <label htmlFor="incident-severity" style={labelStyle}>
          Severity <span style={requiredMarkStyle}>*</span>
        </label>
        <select
          id="incident-severity"
          data-testid="incident-severity-select"
          value={values.severity}
          onChange={(event) => handleFieldChange('severity', event.target.value)}
          onBlur={() => handleBlur('severity')}
          style={controlStyle(touched.severity && Boolean(errors.severity))}
        >
          <option value="">Select severity…</option>
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
        {touched.severity && errors.severity && (
          <span data-testid="incident-severity-error" style={errorTextStyle}>
            {errors.severity}
          </span>
        )}
      </div>

      <div style={fieldGroupStyle}>
        <span id="incident-components-label" style={labelStyle}>
          Affected Components <span style={requiredMarkStyle}>*</span>
        </span>
        <div
          data-testid="incident-components-select"
          role="group"
          aria-labelledby="incident-components-label"
          style={multiSelectStyle(touched.affectedComponents && Boolean(errors.affectedComponents))}
        >
          {components.map((component) => (
            <label
              key={component.id}
              data-testid={`incident-component-option-${component.id}`}
              style={checkboxLabelStyle}
            >
              <input
                type="checkbox"
                checked={values.affectedComponents.includes(component.id)}
                onChange={() => handleComponentToggle(component.id)}
                onBlur={() => handleBlur('affectedComponents')}
              />
              {component.name}
            </label>
          ))}
        </div>
        {touched.affectedComponents && errors.affectedComponents && (
          <span data-testid="incident-components-error" style={errorTextStyle}>
            {errors.affectedComponents}
          </span>
        )}
      </div>

      <div style={fieldGroupStyle}>
        <label htmlFor="incident-summary" style={labelStyle}>
          Summary <span style={requiredMarkStyle}>*</span>
        </label>
        <textarea
          id="incident-summary"
          data-testid="incident-summary-input"
          value={values.summary}
          onChange={(event) => handleFieldChange('summary', event.target.value)}
          onBlur={() => handleBlur('summary')}
          maxLength={SUMMARY_MAX_LENGTH}
          rows={4}
          style={controlStyle(touched.summary && Boolean(errors.summary))}
        />
        {touched.summary && errors.summary && (
          <span data-testid="incident-summary-error" style={errorTextStyle}>
            {errors.summary}
          </span>
        )}
      </div>

      <button
        type="submit"
        data-testid="incident-submit-button"
        disabled={!valid || submitting}
        style={submitButtonStyle(!valid || submitting)}
      >
        {submitting ? 'Declaring…' : 'Declare Incident'}
      </button>
    </form>
  );
}

export default IncidentForm;
