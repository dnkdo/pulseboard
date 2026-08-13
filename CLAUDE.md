# CLAUDE.md

## Project

Pulseboard — a status-page / incident-management system. Public status page (component health, incidents, uptime) plus an internal dashboard for declaring and managing incidents through a state machine.

## Stack

Do not introduce technologies outside this list without an explicit user request.

- **Monorepo**: npm workspaces at the root (`frontend/`, `backend/`, likely a shared package if one exists — check `package.json` workspaces before assuming layout).
- **Frontend**: Vite + React 18, Tailwind CSS, React Router.
- **Backend**: Node.js + Express.
- **Persistence**: SQLite via `better-sqlite3`, or the project's JSON-store module — check what's already wired up in `backend/` before adding a new persistence path. Don't add an ORM.
- **Testing**: Vitest for both workspaces (jsdom environment for frontend, node environment for backend).
- **Lint/format**: ESLint + Prettier, run per-workspace.
- **Config**: `.adlc.json` at the repo root declares the test command and tech stack — treat it as authoritative for how CI invokes tests; keep it in sync if commands change.

Never assume a backend framework other than Express, or a frontend framework other than React, even if a task description is vague about "the frontend framework" — this repo has already chosen React.

## Commands

Check `package.json` (root and each workspace) for the exact scripts before running anything — don't guess flags. Typical shape to expect:

- `npm test` / `npm run test --workspace=<name>` — Vitest
- `npm run lint --workspace=<name>` — ESLint
- `npm run dev` — Vite dev server / Express server
- A reseed CLI (see below) for regenerating deterministic fixtures

Run the relevant workspace's lint and test suite after any change before considering a task done.

## Core domain model

- **Entities**: `Incident` and `Component`, with enum-typed `severity` (SEV1/SEV2/SEV3) and `status`/`state` fields. Look up the canonical enum values and shapes in the schema/model module rather than re-deriving them — do not invent new severity or status values.
- **Incident state machine**: state transitions are validated through an `isValidTransition` function — never mutate incident state directly in a route handler or component; always go through the validator. If you need a new transition, update the state machine definition, not ad-hoc checks scattered across call sites.
- **Clock abstraction**: the backend uses an injectable clock module rather than calling `Date.now()`/`new Date()` directly, so tests can run deterministically. Use the existing clock abstraction for any new time-dependent logic (timestamps, uptime windows, seed data) instead of calling system time APIs directly.
- **Seed data**: fixtures are generated deterministically (fixed timestamps, fixed severities/statuses) via a reseed CLI. If you add new entity fields, update the seed fixtures so they stay comprehensive and reproducible — don't leave seed data out of sync with the schema.

## API surface

Public/shared REST endpoints (exact framework wiring is in `backend/`):

- `GET /api/incidents`
- `GET /api/incidents/:id`
- `GET /api/components`
- `GET /api/status`
- `POST /api/incidents`
- `PATCH /api/incidents/:id/state`

When adding endpoints, follow the existing route/controller/repository layering already established in the backend rather than putting query logic directly in route handlers. Public-facing views of an incident must go through a field-filtering function (e.g. `toPublicIncidentView`) — never serialize the full internal incident object to public routes.

## Frontend conventions

- Functional components only, consuming the REST API above (fetch with explicit loading/error states — don't swallow fetch failures silently).
- Client-side filtering (component, severity, date range) is implemented as small, pure, independently-testable utility functions (`filterByComponent`, `filterBySeverity`, `filterByDateRange`, etc.), composed into a combined filter state. Keep filter logic in these utilities, not inlined in component render bodies.
- Design tokens (colors for severity, component status, dark-theme dashboard variables) live in dedicated token/mapping functions (e.g. `getSeverityColor`, `getComponentStatusColor`, `severityColor`, `stateChipConfig`). Reuse these mappings rather than hardcoding hex/Tailwind classes for severity or status colors anywhere else.
- The public status page follows a Figma spec (file `40C0dQPIXhkZA9eMMaT18J`) for layout and design tokens. If a task involves public-page visual work and the spec is ambiguous or unavailable, say so rather than guessing pixel values — check for a `DesignSync`-type tool or existing token file before inventing new values.
- Routing is React Router; incident detail and public incident detail are separate routed views with separate field-visibility rules (internal view = full data, public view = filtered via `toPublicIncidentView`).

## Backend calculation modules

Uptime and banner-status calculations are pure-function pipelines (extract downtime interval → clip to reporting period → merge overlapping intervals → calculate percentage → format). When touching this area, preserve the pipeline shape and keep each stage a pure, independently testable function — don't collapse them into one monolithic calculation. There is a documented formula spec for uptime; keep it updated if the calculation changes.

## Testing conventions

- Backend tests run under Vitest's node environment; frontend under jsdom.
- Prefer pure functions for anything computed (filters, uptime math, status derivation, export serialization, grouping/sorting) so they're testable without mounting components or spinning up the server.
- Tests that depend on time must use the clock abstraction/fixed seed data, not real wall-clock time — this is required for deterministic, reproducible fixtures (`Date.now()` in a test is a bug, not a shortcut).
- CSV export must be RFC4180-compliant (escaping is a real correctness requirement, not cosmetic) — test it against inputs containing commas, quotes, and newlines.

## General engineering rules

- Don't add a new persistence layer, ORM, state-management library, or CSS framework beyond Tailwind without asking first.
- Keep pure computation (filters, uptime math, grouping, export mapping, status derivation) separate from React components and Express route handlers — this repo's structure consistently favors small testable utility modules over logic embedded in UI/route code, and new work should match that pattern.
- Don't bypass the incident state machine's transition validation, even for "just this once" internal tooling.
- When a task references a Figma spec, design tokens, or exact enum/status values you don't have in context, look them up in the existing token/schema modules before inventing values.
