# CLAUDE.md

## Project

Pulseboard — a status-page / incident-management system. Public status page (component health, incidents, uptime) plus an internal dashboard for declaring and managing incidents through a state machine, with filtering, grouping, and history export.

## Stack

Do not introduce technologies outside this list without an explicit user request.

- **Monorepo**: npm workspaces at the root (client/server packages, per PLB-1 scaffolding — check `package.json` `workspaces` field before assuming exact folder names, e.g. `client/`+`server/` vs `frontend/`+`backend/`).
- **Frontend**: Vite + React 18, React Router, Tailwind CSS for the public status page. Some internal-dashboard token work may be CSS-in-JS — check the existing token module (`getSeverityColor`, `stateChipConfig`, etc.) in the codebase before choosing an approach for new token work; don't mix a third styling system in.
- **Backend**: Node.js + Express.
- **Persistence**: SQLite via `better-sqlite3`, or the project's JSON seed-store module — check what's already wired up in the server package before adding a new persistence path. Don't add an ORM.
- **Testing**: Vitest for both workspaces (jsdom environment for frontend, node environment for backend), configured as the shared monorepo test runner.
- **Lint/format**: ESLint + Prettier, configured at the root and run per-workspace.
- **Config**: `.adlc.json` at the repo root declares project metadata and the test command — treat it as authoritative for how CI invokes tests; keep it in sync if commands change. `vercel.json` at the root configures monorepo deployment for both client and server — keep it in sync with workspace layout changes.

Never assume a backend framework other than Express, or a frontend framework other than React, even if a task description is vague — this repo has already chosen React + Express.

## Commands

Check `package.json` (root and each workspace) for the exact scripts before running anything — don't guess flags. Typical shape to expect:

- `npm test` / `npm run test --workspace=<name>` — Vitest
- `npm run lint --workspace=<name>` — ESLint
- `npm run dev` — Vite dev server / Express server
- A reseed CLI for regenerating deterministic fixtures

Run the relevant workspace's lint and test suite after any change before considering a task done. If a smoke-test script exists (client + server build health), run it before reporting build/deploy-related work as complete.

## Core domain model

- **Entities**: `Incident` and `Component`, defined in a schema module with auto-initialization on first run. `Incident` has enum-typed `severity` (SEV1/SEV2/SEV3) and `status`/`state`; `Component` has a health state, uptime, and (per PLB-7) a `category` field used for grouping. Look up canonical enum and shape definitions in the schema module rather than re-deriving them — do not invent new severity, status, or category values.
- **Incident state machine**: transitions are validated through a sequential-transition validator (used by `PATCH /api/incidents/:id`) — never mutate incident state directly in a route handler or component; always go through the validator. If you need a new transition, update the state machine definition, not ad-hoc checks scattered across call sites.
- **Active vs. past partitioning**: incidents are split into active/past via a dedicated partitioning module (backend) and mirrored by frontend filter utilities (`filterActiveIncidents`, `sortPastIncidentsDesc`). Keep both in sync with the state machine's definition of "resolved."
- **Uptime & banner status**: `calculateUptime()` is a pure function with injectable timestamps — never call `Date.now()`/`new Date()` inside it or its callers. Public banner status is aggregated server-side (Public Banner Status Aggregation Logic) and mirrored client-side by `computeOverallStatus` — keep the two aggregation rules consistent when either changes.
- **Clock abstraction**: the backend uses an injectable clock module rather than calling system time APIs directly, so tests run deterministically. Use it for any new time-dependent logic (timestamps, uptime windows, seed data, transition history) instead of calling `Date.now()`/`new Date()` directly.
- **Seed data**: fixtures are deterministic (fixed timestamps, severities, statuses, categories) and auto-load on fresh install via the seed dataset module. If you add or change entity fields (e.g. a new `Component` field), update the seed fixtures so they stay comprehensive and reproducible — don't leave seed data out of sync with the schema.

## API surface

REST endpoints exposed by the Express backend (exact route/controller wiring is in the server package — confirm before assuming a path):

- `GET /api/incidents` — supports filtering via `filterIncidents` (severity, date range, component) wired into the query layer
- `GET /api/incidents/:id` — includes transition history
- `GET /api/components` / `GET /api/components/:id` — includes health state, uptime, category
- `GET /api/stats` — aggregate operational stats (`computeStatCards`)
- `POST /api/incidents` — declare a new incident, with field validation
- `PATCH /api/incidents/:id` — sequential state transition, validated against the state machine
- Incident history export endpoint(s) — CSV and JSON, via the export functions from PLB-7

Do not assume a separate `GET /api/status` endpoint exists unless you find it in the codebase — public banner status may be derived client-side from `/api/components` + `/api/incidents` via `computeOverallStatus`, or served through `/api/stats`; check before building against it.

When adding endpoints, follow the existing route/controller/repository layering rather than putting query or aggregation logic directly in route handlers. Public-facing views of an incident must go through `filterPublicIncidentFields` — never serialize the full internal incident object (including internal-only transition metadata) to public routes.

## Frontend conventions

- Functional components only, consuming the REST API above via a polling client with explicit loading/error states — don't swallow fetch failures silently.
- There are two client surfaces: the **public status page** (banner, component tiles, active/past incidents, public incident detail) and the **internal dashboard** (stat cards, severity timeline, state chips, declare/transition forms, incident detail with full transition history). Keep field visibility and styling separate between them — don't leak internal-only data or dark-theme tokens into the public page, or vice versa.
- Client-side filtering (component, severity, date range) and sorting/grouping (`filterIncidentsByComponent`, `sortTransitions`, category grouping) are implemented as small, pure, independently-testable utility functions, composed into combined filter/sort state. Keep this logic in utilities, not inlined in component render bodies.
- Design tokens (severity colors, component health colors, dashboard dark-theme variables, state-chip mappings via `getStateChipProps`) live in dedicated token/mapping modules. Reuse these mappings rather than hardcoding hex values or raw Tailwind color classes for severity/status anywhere else — the severity color restriction audit script enforces this, so new severity-colored UI must go through the token module or the audit will flag it. Run that audit after touching anything severity-colored.
- The public status page follows a Figma light-theme design-token spec. If a task involves public-page visual work and the spec is ambiguous or unavailable, say so rather than guessing pixel values — check for a `DesignSync`-type tool or existing token file before inventing new values.
- Routing is React Router. Incident detail (internal, full data) and public incident detail (filtered via `filterPublicIncidentFields`) are separate routed views. Dashboard timeline entries and incident cards must navigate to the correct detail route (internal vs. public) via click-through — don't cross-wire the two.
- Export triggers (CSV/JSON) in the incident history view call the backend export endpoint(s) with a format selector — keep export format selection server-driven (query param or similar), not a client-side re-serialization of already-fetched data, so CSV/JSON output stays consistent with the backend's RFC4180-compliant export.

## Backend calculation modules

Uptime and banner-status calculations are pure-function pipelines (extract downtime interval → clip to reporting period → merge overlapping intervals → calculate percentage → format). When touching this area, preserve the pipeline shape and keep each stage pure and independently testable — don't collapse it into one monolithic calculation. Keep any formula spec doc in sync if the calculation changes.

`computeStatCards`, `filterIncidents`, and the CSV/JSON export functions follow the same pattern: pure, input-in/output-out functions that route handlers call, not logic embedded in the handler itself.

## Testing conventions

- Backend tests run under Vitest's node environment; frontend under jsdom.
- Prefer pure functions for anything computed (filters, uptime math, status derivation, export serialization, grouping/sorting, transition ordering) so they're testable without mounting components or spinning up the server.
- Tests that depend on time must use the clock abstraction and fixed seed data, not real wall-clock time — this is required for deterministic, reproducible fixtures (`Date.now()` in a test is a bug, not a shortcut).
- CSV export must be RFC4180-compliant (quoting/escaping of commas, quotes, and newlines is a real correctness requirement, not an edge case to skip).
- Integration tests should cover cross-cutting sync behavior explicitly called out in the epics (e.g. resolving an incident propagating to dashboard stat cards/timeline/public banner) rather than relying on unit tests of the individual pieces alone.
