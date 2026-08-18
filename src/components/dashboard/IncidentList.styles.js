// CSS-in-JS style objects for the dashboard incident list. Mirrors
// Timeline.styles.js's container/row/typography shape (same surface, radius,
// and spacing tokens from .adlc/design/tokens.json / DESIGN.md's "Tables"
// rule) so the list and timeline read as one visual system when rendered
// side by side off the shared IncidentFilterContext.

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

export const incidentListContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1E293B', // token: colors.surface-secondary-dark
  borderRadius: '8px', // token: radius.lg
  overflow: 'hidden',
};

export const incidentListHeaderStyle = {
  padding: '12px 16px', // DESIGN.md Tables: 12px vertical x 16px horizontal
  backgroundColor: '#1E293B', // token: colors.surface-secondary-dark
  borderTop: '1px solid #475569', // token: colors.border-dark
  fontFamily: FONT_FAMILY,
  fontSize: '12px', // typography token: body-sm.fontSize
  fontWeight: 400, // typography token: body-sm.fontWeight
  lineHeight: '16px', // typography token: body-sm.lineHeight
  color: '#94A3B8', // token: colors.text-muted-dark
};

// Alternating background per DESIGN.md Tables: "alternating subtle background
// shift for scannability" — odd rows shift to surface-tertiary-dark.
export function incidentListRowStyle(index) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px', // spacing token: 12
    padding: '12px 16px', // DESIGN.md Tables: 12px vertical x 16px horizontal
    backgroundColor: index % 2 === 1 ? '#334155' : 'transparent', // token: colors.surface-tertiary-dark
  };
}

export const incidentListRowTitleStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  fontWeight: 400, // typography token: body-md.fontWeight
  lineHeight: '20px', // typography token: body-md.lineHeight
  color: '#F1F5F9', // token: colors.text-primary-dark
};

export const incidentListEmptyStyle = {
  padding: '16px', // spacing token: 16
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  lineHeight: '20px', // typography token: body-md.lineHeight
  color: '#94A3B8', // token: colors.text-muted-dark
};
