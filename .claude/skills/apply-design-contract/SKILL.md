---
name: apply-design-contract
description: Apply the project design contract (.adlc/design/tokens.json + DESIGN.md) when building or changing any UI — components, styles, layout, colors, typography, spacing.
allowed-tools: Read
---

# Apply the design contract

The design contract is distilled from the project's Figma file and committed by the
ADLC pipeline. UI work that ignores it will fail design review.

1. Read `.adlc/design/tokens.json` (semantic tokens: colors, typography, spacing,
   radius, shadows) and `.adlc/design/DESIGN.md` (layout patterns, component rules,
   look & feel). If neither file exists, this project has no design contract — follow
   the styles already used in the codebase instead.
2. Use tokens for every value that has one. **Never hardcode a hex color, font size,
   spacing, or radius that exists as a token** — reference the token (via the
   project's Tailwind config / CSS variables if wired, otherwise the token value with
   a comment naming the token).
3. Follow DESIGN.md component rules (buttons, cards, forms, badges, tables) before
   inventing a new pattern; reuse the project's existing components first.
4. New tokens are a design decision — do not add them yourself; flag the gap in your
   final summary instead.
