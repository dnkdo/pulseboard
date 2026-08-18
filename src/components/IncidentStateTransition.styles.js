// CSS-in-JS style objects for IncidentStateTransition, styled per
// DESIGN.md's "Buttons" section (primary blue, dark theme — internal
// dashboard). Mirrors the token-reuse pattern established by
// src/components/IncidentForm.styles.js's submitButtonStyle/apiErrorBannerStyle.
import { darkTheme, STATE_INVESTIGATING } from '../theme/tokens.js';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

// Distinct "danger" red for the error banner, not a SEV1/2/3 severity
// token — matches IncidentForm.styles.js's ERROR_COLOR.
const ERROR_COLOR = '#DC2626';

export function advanceButtonStyle(disabled) {
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

export const transitionErrorStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  padding: '8px', // spacing token: 8
  marginBottom: '8px', // spacing token: 8
  borderRadius: '4px', // token: radius.sm
  border: `1px solid ${ERROR_COLOR}`,
  color: ERROR_COLOR,
  backgroundColor: darkTheme.surfaceRaised,
};
