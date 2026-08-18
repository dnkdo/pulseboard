// CSS-in-JS style objects for the Declare Incident form, styled per
// DESIGN.md's "Form Controls" section (dark theme — internal dashboard).
// Mirrors the token-reuse pattern established by
// src/components/dashboard/ComponentFilterControls.styles.js.
import { darkTheme, STATE_INVESTIGATING } from '../theme/tokens.js';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

// DESIGN.md's Hard Rules reserve red/orange/yellow for severity indicators
// only, so this is a distinct "danger" red for validation errors — not
// src/theme/tokens.js's SEV1_COLOR — matching the Buttons section's
// danger-action red rather than the severity palette.
const ERROR_COLOR = '#DC2626';

export const formContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px', // spacing token: 16 (section gaps)
  padding: '16px', // DESIGN.md Cards: 16px padding
  backgroundColor: darkTheme.surface,
  borderRadius: '8px', // token: radius.lg
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // token: shadow.md
  maxWidth: '480px',
  fontFamily: FONT_FAMILY,
};

export const fieldGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px', // spacing token: 8
};

export const labelStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '12px', // typography token: label.fontSize
  fontWeight: 600, // typography token: label.fontWeight
  lineHeight: '16px', // typography token: label.lineHeight
  color: darkTheme.textSecondary,
};

export const requiredMarkStyle = {
  color: ERROR_COLOR,
};

const controlBaseStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  padding: '8px', // DESIGN.md Form Controls: 8px padding
  borderRadius: '4px', // token: radius.sm
  border: `1px solid ${darkTheme.border}`,
  backgroundColor: darkTheme.surfaceRaised,
  color: darkTheme.text,
};

export function controlStyle(invalid) {
  return {
    ...controlBaseStyle,
    border: `1px solid ${invalid ? ERROR_COLOR : darkTheme.border}`, // DESIGN.md Form Controls: "Validation error: red border"
  };
}

export function multiSelectStyle(invalid) {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px', // spacing token: 4
    padding: '8px', // DESIGN.md Form Controls: 8px padding
    borderRadius: '4px', // token: radius.sm
    border: `1px solid ${invalid ? ERROR_COLOR : darkTheme.border}`,
    backgroundColor: darkTheme.surfaceRaised,
  };
}

export const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px', // spacing token: 8
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  color: darkTheme.text,
};

export const errorTextStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '12px', // typography token: body-sm.fontSize
  lineHeight: '16px', // typography token: body-sm.lineHeight
  color: ERROR_COLOR,
};

export const apiErrorBannerStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  padding: '8px', // spacing token: 8
  borderRadius: '4px', // token: radius.sm
  border: `1px solid ${ERROR_COLOR}`,
  color: ERROR_COLOR,
  backgroundColor: darkTheme.surfaceRaised,
};

export function submitButtonStyle(disabled) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: '14px', // typography token: body-md.fontSize
    fontWeight: 600,
    padding: '8px 16px', // DESIGN.md Buttons: 8px vertical x 16px horizontal
    borderRadius: '6px', // token: radius.md
    minHeight: '32px', // DESIGN.md Buttons: 32px min-height
    border: 'none',
    backgroundColor: disabled ? darkTheme.border : STATE_INVESTIGATING, // DESIGN.md Buttons: primary blue (#3B82F6)
    color: darkTheme.textOnColor,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
