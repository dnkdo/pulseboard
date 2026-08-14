// CSS-in-JS style objects for the dashboard state Chip, values pulled from
// .adlc/design/tokens.json / DESIGN.md's Badges & Chips rule (radius-sm,
// 4px vertical x 8px horizontal padding, label typography, solid background
// with white text). No dedicated theme-token module for spacing/typography
// exists yet, so raw values are inlined here with a comment naming the
// source token.

export function chipStyle(token) {
  return {
    display: 'inline-block',
    padding: '4px 8px', // DESIGN.md Badges & Chips: 4px vertical x 8px horizontal
    borderRadius: '4px', // token: radius.sm
    backgroundColor: token,
    color: '#FFFFFF', // DESIGN.md: solid background with white text
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    fontSize: '12px', // typography token: label.fontSize
    fontWeight: 600, // typography token: label.fontWeight
    lineHeight: '16px', // typography token: label.lineHeight
  };
}

export const chipNeutralStyle = {
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '4px',
  backgroundColor: '#334155', // token: colors.surface-tertiary-dark
  color: '#94A3B8', // token: colors.text-muted-dark
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: '16px',
};
