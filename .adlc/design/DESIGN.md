# Pulseboard Design System

## Overview

Pulseboard is a dual-interface incident platform for engineering teams and customers. The internal dashboard (dark theme) is optimized for on-call incident management; the public status page (light theme) provides customer-facing clarity. Both surfaces share semantic tokens, enforcing visual and functional consistency while respecting theme context and audience.

## Design Principles

- **Severity as primary signal**: Red/orange/yellow reserved exclusively for incident severity indication (timeline, state chips, active cards)—never reused elsewhere
- **State transparency**: Every incident displays one of four distinct states (open, investigating, identified, resolved) via consistent chip styling
- **Clarity first**: Visual hierarchy guides rapid comprehension during high-stress incident response
- **Accessibility mandatory**: WCAG AA contrast ratios on all text-on-surface pairs; color paired with icons/text, never sole indicator

## Color Palette

### Dark Theme (Internal Dashboard)
- **Surfaces**: Primary #0F172A, Secondary #1E293B, Card #1E293B
- **Text**: Primary #F1F5F9, Secondary #CBD5E1 (muted)
- **Borders**: #475569

### Light Theme (Public Status Page)
- **Surfaces**: White #FFFFFF, Light Secondary #F8FAFC
- **Text**: Primary #0F172A, Secondary #64748B, Muted #94A3B8
- **Borders**: #E2E8F0

### Severity Colors (Both Themes)
- **SEV1 Critical**: #EF4444 (red)—timeline border-left, chip text/bg, active incident accent
- **SEV2 Warning**: #F97316 (orange)—timeline, chip, degraded state
- **SEV3 Notice**: #EAB308 (yellow)—timeline, chip, advisory state
- **Operational**: #22C55E (green)—status banner, healthy tiles, resolved badges
- **Info**: #3B82F6 (blue)—secondary actions, informational context

**HARD RULE**: Severity colors appear ONLY in state chips, timeline entries, active incident borders, and incident-driven component health indicators. No buttons, generic errors, or decorative elements may use these tokens.

## Typography

**Font Stack**: System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`)

**Scale**:
- **Display LG**: 36px / 700wt (rare, page hero)
- **Heading XL**: 28px / 600wt (major sections: "Dashboard", "Status")
- **Heading LG/MD**: 24px/20px / 600wt (card titles, subsections)
- **Heading SM**: 16px / 600wt (form labels, metric labels)
- **Body LG**: 16px / 400wt (primary content, incident titles)
- **Body MD**: 14px / 400wt (standard text, component names)
- **Body SM**: 13px / 400wt (secondary text, captions)
- **Label MD/SM**: 14px/12px / 500wt (form labels, button text, chip labels)
- **Caption**: 12px / 400wt (timestamps, metadata)
- **Mono**: 13px / 400wt (incident IDs, timestamps, code)

## Spacing & Layout

**Scale** (4px-based): 4, 8, 12, 16, 24, 32, 48, 64

- **Stat Cards**: 4-column desktop, 2-column tablet, 1-column mobile; 24px padding, centered
- **Incident Timeline**: 16px padding per entry, 4px left border in severity color, shadow-card
- **Component Tiles**: 3-column desktop; 16px padding, shadow-sm
- **Form Inputs**: 12px padding, radius-md, 1px border in border-* tokens
- **Buttons**: 8px (vertical) × 16px (horizontal), radius-md, label-md font
- **Cards**: 16–24px padding, shadow-card or shadow-sm, radius-md

## Component Rules

### Buttons
- **Primary action**: bg-status-info (#3B82F6), text white, hover darker; 8×16px padding
- **Secondary**: bg-surface-secondary/light-secondary, border 1px, text primary
- **State chips**: 4×8px padding, label-sm, bg+text in severity color OR semantic color with white text, radius-sm

### Incident Cards (Timeline)
- **Border-left**: 4px in severity-* color
- **Padding**: 16px
- **Title**: heading-sm
- **State chip**: Inline, top-right aligned
- **Timestamp**: caption, text-secondary
- **Affected components**: Comma-separated list, body-sm
- **Shadow**: card

### Status Banner (Public)
- **Full-width**, sticky or top
- **Background**: status-success (#22C55E) if operational; severity-* if active incident
- **Padding**: 16px (v) × 24px (h)
- **Text**: heading-md, white or high-contrast
- **Icon** (optional): 24px, left-aligned

### Active Incident Card (Public)
- **Visible**: Only if ≥1 unresolved incident
- **Border-left**: 4px in severity color
- **Content**: Title (heading-md), state chip, severity chip, affected components (pills), summary (body-md)
- **Padding**: 24px, **shadow-card**

### Component Health Tiles (Public)
- **Layout**: 3-column grid desktop, responsive
- **Content**: Component name (heading-sm), status badge, uptime % (heading-md centered)
- **If incident affects**: Subtle severity-color tint (10% opacity) or colored left border
- **Shadow**: shadow-sm

### Form Validation
- **Error text**: severity-1 (#EF4444)
- **Success text**: status-success (#22C55E)
- **Required indicator**: Red asterisk (*) in severity-1
- **Input states**: Border color changes on focus (status-info), error (severity-1)

### Icons
- **Set**: Heroicons v2 (outline default, solid on hover)
- **Size**: 16px (inline), 24px (headers), 32px (hero)
- **Color**: Inherit from text or use status colors for severity/health indicators only

## Responsive Design

- **Desktop** (1200px+): Full 4-column stat grid, 3-column tiles, sidebar visible
- **Tablet** (768–1199px): 2-column stat grid, 2-column tiles, collapsible nav
- **Mobile** (<768px): 1-column stacked, font sizes unchanged, spacing scales linearly

## Accessibility

- **Contrast**: All text pairs ≥WCAG AA (4.5:1 body, 3:1 large)
- **Focus**: 2px outline in status-info, 2px offset, visible on all interactive elements
- **Color not sole indicator**: Severity paired with text label + badge icon; state paired with chip text + icon
- **Semantic HTML**: Native `<button>`, `<input>`, `<label>`, `<nav>` elements; no divs as buttons
- **ARIA**: Incident state, severity, component health have descriptive labels and live regions if dynamic
- **Testing**: Automated contrast check on release; manual keyboard nav and screen-reader audit

## Hard Rules (Non-Negotiable)

1. Severity colors (#EF4444, #F97316, #EAB308) used ONLY for severity indication
2. All spacing, padding, margin, radius values must map to token scales
3. No hardcoded hex or px values; use only token names in code
4. Dark theme on `/dashboard`, light theme on `/status`—no mixing
5. Stat cards and incident timeline cards must use shadow-card
6. State transitions display in state chips only (not free-form text)
7. All text must pass WCAG AA contrast ratios
8. Monospace font reserved for IDs, timestamps, code snippets
9. Primary action button distinct from severity colors (use status-info)
10. No generic error/warning buttons; severity colors reserved for incident state only

## Implementation

- Export tokens as CSS custom properties (`:root { --surface-primary: #0F172A; ... }`)
- Or map to Tailwind config for utility classes (`bg-surface-card`, `text-text-primary`, etc.)
- Verify both themes in browser (prefers-color-scheme: dark/light) and manual switch
- Test all component examples (stat cards, timeline, tiles, banner, forms) against token contract before release
