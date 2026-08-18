// CSS-in-JS style objects for the dashboard's stat cards row, values pulled
// from .adlc/design/tokens.json / DESIGN.md's Cards rule (surface-tertiary
// background, 16px padding, radius-lg, shadow-md, h4 title typography /
// text-primary, body-md content typography / text-secondary) and the
// "Stat cards row: 4 cards in row (gap: 20px)" layout rule. Colors come from
// the shared darkTheme token module (src/theme/tokens.js) rather than being
// inlined here, matching Chip.styles.js/Timeline.styles.js's convention.

import { darkTheme } from '../../theme/tokens.js';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

export const statCardsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '20px', // DESIGN.md: "Stat cards row: 4 cards in row (gap: 20px)"
  maxWidth: '1200px',
};

export const statCardStyle = {
  backgroundColor: darkTheme.surfaceRaised, // token: colors.surface-tertiary-dark — DESIGN.md Cards: "Background: surface-tertiary (dark)"
  padding: '16px', // DESIGN.md Cards: padding 16px
  borderRadius: '8px', // token: radius.lg
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // token: shadows.md
  fontFamily: FONT_FAMILY,
};

export const statCardLabelStyle = {
  display: 'block',
  fontSize: '14px', // typography token: body-md.fontSize
  fontWeight: 400, // typography token: body-md.fontWeight
  lineHeight: '20px', // typography token: body-md.lineHeight
  color: darkTheme.textSecondary, // token: colors.text-secondary-dark — DESIGN.md Cards: "Content: body-md, text-secondary"
};

export const statCardValueStyle = {
  display: 'block',
  fontSize: '16px', // typography token: h4.fontSize
  fontWeight: 600, // typography token: h4.fontWeight
  lineHeight: '24px', // typography token: h4.lineHeight
  color: darkTheme.text, // token: colors.text-primary-dark — DESIGN.md Cards: "Title: h4 typography, text-primary"
};

export const statCardsEmptyStyle = {
  padding: '16px', // spacing token: 16
  fontFamily: FONT_FAMILY,
  fontSize: '14px', // typography token: body-md.fontSize
  lineHeight: '20px', // typography token: body-md.lineHeight
  color: darkTheme.textMuted, // token: colors.text-muted-dark
};
