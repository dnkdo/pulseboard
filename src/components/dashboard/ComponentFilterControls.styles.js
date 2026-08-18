// CSS-in-JS style objects for the dashboard's component filter buttons.
// Reuses the state-chip token family (STATE_INVESTIGATING for the active
// selection, colors.border-dark/text-muted-dark for inactive buttons)
// rather than introducing a new hue, since this control isn't
// severity-colored and DESIGN.md reserves the SEV1/2/3 palette for
// severity indicators only (see src/theme/tokens.js's non-overlap comment).
import { STATE_INVESTIGATING } from '../../theme/tokens.js';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

export const filterControlsContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px', // spacing token: 8
  padding: '12px 16px', // DESIGN.md Tables: 12px vertical x 16px horizontal
};

export function filterButtonStyle(active) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: '12px', // typography token: label.fontSize
    fontWeight: 600, // typography token: label.fontWeight
    lineHeight: '16px', // typography token: label.lineHeight
    padding: '4px 8px', // DESIGN.md Badges & Chips: 4px vertical x 8px horizontal
    borderRadius: '4px', // token: radius.sm
    border: active ? `1px solid ${STATE_INVESTIGATING}` : '1px solid #475569', // token: colors.border-dark
    backgroundColor: active ? STATE_INVESTIGATING : 'transparent',
    color: active ? '#FFFFFF' : '#94A3B8', // token: colors.text-muted-dark
    cursor: 'pointer',
  };
}
