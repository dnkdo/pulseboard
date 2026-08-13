# Pulseboard Design Contract

## Overview

Pulseboard uses a split-theme design system: dark navy dashboard for on-call engineers (high density, night-shift optimized), light clean status page for customers (trustworthy, readable). Both themes share typography, spacing, and component logic but diverge on surface colors and contrast. Severity colors (red/orange/yellow) are semantic-only and never reused for generic states.

## Theme Foundations

### Internal Dashboard (Dark)
- **Surfaces**: Deep navy primary → slate secondary → lighter slate tertiary (visual hierarchy via lightness)
- **Text**: Off-white primary, muted secondary for supporting info
- **Context**: 24/7 on-call work; dark reduces eye strain and cognitive load during incident response

### Public Status Page (Light)
- **Surfaces**: Pure white primary, very light gray secondary/tertiary
- **Text**: Near-black primary, slate secondary
- **Context**: Customer-facing; calm, clean, high-trust appearance

## Color Tokens

### Severity (Fixed, Non-Negotiable)
- **SEV1**: `#EF4444` (red) — incident timeline, severity badges, state chips only
- **SEV2**: `#F97316` (orange) — incident timeline, severity badges, state chips only
- **SEV3**: `#FBBF24` (yellow) — incident timeline, severity badges, state chips only
- **Operational**: `#10B981` (green) — status banners, component health indicators
- **Investigating**: `#3B82F6` (blue) — state chips, action buttons

### WCAG AA Compliance
All text + surface combinations meet 4.5:1 contrast (normal text) or 3:1 (large). No exceptions. Severity colors are high-contrast graphical elements, not sole color differentiators.

## Typography

| Role | Size | Weight | Line Height | Use |
|------|------|--------|-------------|-----|
| h1 | 32px | 700 | 40px | Page titles |
| h2 | 24px | 700 | 32px | Section headers |
| h3 | 20px | 600 | 28px | Card titles, subsections |
| h4 | 16px | 600 | 24px | Form labels |
| body-lg | 16px | 400 | 24px | Primary content |
| body-md | 14px | 400 | 20px | Supporting text |
| body-sm | 12px | 400 | 16px | Captions, metadata |
| label | 12px | 600 | 16px | Form labels, badges |

**Font Stack**: System fonts only (no brand typeface). `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`

## Spacing (4px unit)

4, 8, 12, 16, 20, 24, 32, 40, 48 — use only these values. Never hardcode arbitrary spacing.
- 4px: badge/chip internal padding
- 8px: input padding, small gaps
- 12px: card internal spacing
- 16px: card/modal padding, section gaps
- 20px: stat card gaps, horizontal page margins
- 24px: vertical section spacing
- 32px: major container gaps
- 40px: page section breaks
- 48px: full-page top/bottom padding

## Radius

- **sm** (4px): input fields, small badges
- **md** (6px): buttons, form controls
- **lg** (8px): cards, modals
- **xl** (12px): hero sections, large containers

## Shadows

- **sm** (0 1px 2px rgba(0,0,0,0.05)): subtle lifts, inputs
- **md** (0 4px 6px rgba(0,0,0,0.1)): cards, stat tiles
- **lg** (0 10px 15px rgba(0,0,0,0.15)): modals, floating panels
- **xl** (0 20px 25px rgba(0,0,0,0.2)): rare elevation, dropdowns

## Layout Patterns

### Dashboard (Dark)
1. Header bar (logo, title) on surface-primary
2. Stat cards row: 4 cards in row (gap: 20px), max-width 1200px, centered
3. Timeline section: full-width incident list, each row colored by severity
4. Filter/search optional above timeline

### Status Page (Light)
1. Header on surface-primary
2. Status banner: large card (radius-xl, shadow-md, surface-tertiary background), centered, showing overall health + highest-severity incident or "Operational"
3. Component grid: responsive 2–4 columns, each tile shows name + health dot + uptime %
4. Active incidents: one card per unresolved incident
5. Past incidents: h3 header + reverse-chronological list

## Component Rules

### Buttons
- Primary: blue background (#3B82F6), white text, 8px vertical × 16px horizontal padding, radius-md, 32px min-height
- Secondary: surface-tertiary background, text-primary color
- Danger (resolve action): red background (#EF4444), white text (for CTA only; not a severity indicator)
- Hover: 10% opacity shift or 1 shade lighter

### Form Controls
- Input/Select: 1px border (border token), radius-sm, 8px padding, text-primary foreground, surface-secondary background
- Label: label typography, text-secondary color, required: red asterisk (*)
- Validation error: red border + error text (body-sm, red color) below

### Cards
- Background: surface-tertiary (dark) or surface-secondary (light)
- Padding: 16px
- Radius: radius-lg
- Shadow: shadow-md
- Title: h4 typography, text-primary
- Content: body-md, text-secondary

### Badges & Chips
- **State chips** (open/investigating/identified/resolved): radius-sm, 4px vertical × 8px horizontal, label typography, solid background with white text, colors per state (open: gray, investigating: blue, identified: slate, resolved: green)
- **Severity badges**: same style, colored per SEV1/2/3
- **Component tags**: border-only, no fill, text-secondary

### Tables (Timeline, Past Incidents)
- Headers: body-sm labels, text-muted, surface-secondary background, border-top only
- Rows: body-md text, text-primary, alternating subtle background shift for scannability
- Severity indicator: colored circle/square on left edge (SEV1/2/3 colors)
- Padding: 12px vertical, 16px horizontal

## Hard Rules

1. **Severity colors ONLY for severity**: Red, orange, yellow never used for buttons, error states, or generic alerts. Green OK for operational/success.
2. **All values must use tokens**: No hardcoded hex, px, rem, or custom values outside the token set.
3. **Icon library**: Single set across both themes (e.g., Lucide, Heroicons, Feather). Monochromatic, inherit text color, severity-colored only when depicting incident severity.
4. **No theme overrides**: Dark theme always uses `*-dark` tokens; light always uses `*-light`. No mixing.
5. **Responsive**: Grids collapse from 4-col → 2-col → 1-col on small screens; modals full-width on mobile.
6. **Accessibility**: Test all text-on-surface pairs with WebAIM Contrast Checker (minimum 4.5:1).
