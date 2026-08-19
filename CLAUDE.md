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
- A severity color audit script (PLB-4) — CI-gated, validates severity color usage against an allowlist; run it whenever severity-color tokens or their consumers change

Run the relevant workspace's lint and test suite after any change before considering a task done. If a smoke-test script exists (client + server build health), run it before reporting build/deploy-related work as complete.

## Core domain model

- **Entities**: `Incident` and `Component`, defined in a schema module with auto-initialization on first run. `Incident` has enum-typed `severity` (SEV1/SEV2/SEV3) and `status`/`state`; `Component` has a health state, uptime, and (per PLB-7) a `category` field used for grouping. Look up canonical enum and shape definitions in the schema module rather than re-deriving them — do not invent new severity, status, or category values.
- **Incident state machine**: transitions are validated through a sequential-transition validator (used by `PATCH /api/incidents/:id`) — never mutate incident state directly in a route handler or component; always go through the validator. If you need a new transition, update the state machine definition, not ad-hoc checks scattered across call sites.
- **Transition history**: every state change appends to the incident's transition history (timestamped, sequential). `sortTransitions` is the canonical ordering utility — use it rather than re-sorting inline wherever transition history is displayed (dashboard timeline, `TransitionHistory` component, incident detail pages).
- **Active vs. past partitioning**: incidents are split into active/past via a dedicated partitioning module (backend) and mirrored by frontend filter utilities (`filterActiveIncidents`, `sortPastIncidentsDesc`). Keep both in sync with the state machine's definition of "resolved."
- **Uptime & banner status**: `calculateUptime()` is a pure function with injectable timestamps — never call `Date.now()`/`new Date()` inside it or its callers. Public banner status is aggregated server-side (Public Banner Status Aggregation Logic) and mirrored client-side by `computeOverallStatus` — keep the two aggregation rules consistent when either changes.
- **Clock abstraction**: the backend uses an injectable clock module rather than calling system time APIs directly, so tests run deterministically. Use it for any new time-dependent logic (timestamps, uptime windows, seed data, transition history) instead of calling `Date.now()`/`new Date()` directly.
- **Seed data**: fixtures are deterministic (fixed timestamps, severities, statuses, categories) and auto-load on fresh install via the seed dataset module. If you add or change entity fields (e.g. a new `Component` field), update the seed fixtures so they stay comprehensive and reproducible — don't leave seed data out of sync with the schema.
- **Public/internal field separation**: `filterPublicIncidentFields` is the single source of truth for what an external viewer may see. Never bypass it to hand-serialize an incident for a public route or component.

## API surface

REST endpoints exposed by the Express backend (exact route/controller wiring is in the server package — confirm before assuming a path):

- `GET /api/incidents` — supports filtering via `filterIncidents` (severity, date range, component) wired into the query layer
- `GET /api/incidents/:id` — includes transition history, sorted via `sortTransitions`
- `GET /api/components` / `GET /api/components/:id` — includes health state, uptime, category
- `GET /api/stats` — aggregate operational stats (`computeStatCards`)
- `POST /api/incidents` — declare a new incident, with field validation
- `PATCH /api/incidents/:id` — sequential state transition, validated against the state machine
- Incident history export endpoint(s) — CSV and JSON, via the export functions from PLB-7

Do not assume a separate `GET /api/status` endpoint exists unless you find it in the codebase — public banner status may be derived client-side from `/api/components` + `/api/incidents` via `computeOverallStatus`, or served through `/api/stats`; check before building against it.

When adding endpoints, follow the existing route/controller/repository layering rather than putting query or aggregation logic directly in route handlers. Public-facing views of an incident must go through `filterPublicIncidentFields` — never serialize the full internal incident object (including internal-only transition metadata) to public routes.

## Frontend conventions

- Functional components with hooks only — no class components.
- Two distinct client surfaces share the same React app: the **public status page** (light theme tokens, Tailwind) and the **internal dashboard** (dark theme tokens, CSS-in-JS or whatever token module is already established). Don't cross-pollinate tokens between the two — check which surface a component belongs to before pulling in a token source.
- Routing is client-side (React Router). Both dashboard timeline entries and public incident cards navigate to a shared/parallel incident detail view (`IncidentDetailPage` internally, `PublicIncidentDetail` publicly) — keep the two detail components separately field-filtered rather than sharing one component with conditional rendering of internal fields.
- Data fetching goes through a shared API client module (`getIncidentById()`, etc.) rather than ad hoc `fetch` calls scattered across components — extend that client when adding new endpoints.
- The public status page uses a live-polling client to stay updated — reuse the existing polling mechanism (interval + cleanup on unmount) for any new live data rather than introducing a second polling strategy (e.g. websockets).
- Component filtering, severity/date filtering, and category grouping (PLB-7) should compose with existing shared filter utilities rather than duplicating filter logic per view.
- Severity and state colors must be pulled from the design-token modules (not hardcoded hex/Tailwind classes inline) — the severity color audit script enforces an allowlist in CI, so ad hoc colors will fail the build.

## Testing conventions

- Vitest, jsdom environment for React components/utilities, node environment for backend/API logic.
- Pure functions (`calculateUptime`, `computeOverallStatus`, `computeStatCards`, `sortTransitions`, `sortPastIncidentsDesc`, `filterPublicIncidentFields`, `groupComponentsByCategory`, export functions) should have direct unit tests with deterministic fixed timestamps/inputs — no reliance on system time.
- Integration tests (e.g. the resolve-incident → public-sync test from PLB-5) should exercise the full route → state machine → partitioning → public aggregation path rather than mocking internal modules — verify the public-facing effect of an internal state change actually lands.
- Add a smoke test for any new route or top-level component (build/health verification), matching the pattern established in PLB-1.
