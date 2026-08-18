// CSS-in-JS style objects for the dashboard incident Timeline, values pulled
// from .adlc/design/tokens.json / DESIGN.md's "Tables (Timeline, Past
// Incidents)" rule (12px vertical x 16px horizontal row padding, severity
// indicator as a colored circle on the left edge, body-sm header labels,
// body-md row text). Colors come from the shared darkTheme token module
// (src/theme/tokens.js) rather than being inlined here.

import { darkTheme } from '../../theme/tokens.js';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

export const timelineContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: darkTheme.surface, // token: colors.surface-secondary-dark
  borderRadius: '8px', // token: radius.lg
  overflow: 'hidden',
};

export const timelineHeaderStyle = {
  padding: '12px 16px', // DESIGN.md Tables: 12px vertical x 16px horizontal
  backgroundColor: darkTheme.surface, // token: colors.surface-secondary-dark
  borderTop: `1px solid ${darkTheme.border}`, // token: colors.border-dark — DESIGN.md Tables: "border-top only"
  fontFamily: FONT_FAMILY,
  fontSize: '12px', // typography token: body-sm.fontSize
  fontWeight: 400, // typography token: body-sm.fontWeight
  lineHeight: '16px', // typography token: body-sm.lineHeight
  color: darkTheme.textMuted, // token: colors.text-muted-dark
};

// Alternating background per DESIGN.md Tables: "alternating subtle background
// shift for scannability" — odd rows shift to surface-tertiary-dark.
export function timelineRowStyle(index) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px', // spacing token: 12
    padding: '12px 16px', // DESIGN.md Tables: 12px vertical x 16px horizontal
    backgroundColor: index % 2 === 1 ? darkTheme.surfaceRaised : 'transparent', // token: colors.surface-tertiary-dark
  };
}

// DESIGN.md Tables: "Severity indicator: colored circle/square on left edge
// (SEV1/2/3 colors)" — `color` must come from getSeverityColor, never a
// literal hex, so the severity-color-usage audit stays clean for this file.
export function severityMarkerStyle(color) {
  return {
    flexShrink: 0,
    width: '12px', // spacing token: 12
    height: '12px', // spacing token: 12
    borderRadius: '50%',
    backgroundColor: color,
  };
}

export const timelineRowTitleStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  fontWeight: 400, // typography token: body-md.fontWeight
  lineHeight: '20px', // typography token: body-md.lineHeight
  color: darkTheme.text, // token: colors.text-primary-dark
};

export const timelineRowMetaStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '12px', // typography token: body-sm.fontSize
  fontWeight: 400, // typography token: body-sm.fontWeight
  lineHeight: '16px', // typography token: body-sm.lineHeight
  color: darkTheme.textMuted, // token: colors.text-muted-dark
};

export const timelineEmptyStyle = {
  padding: '16px', // spacing token: 16
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  lineHeight: '20px', // typography token: body-md.lineHeight
  color: darkTheme.textMuted, // token: colors.text-muted-dark
};
