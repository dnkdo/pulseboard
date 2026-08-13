# pulseboard
Pulseboard — incident status page &amp; on-call ops dashboard (ADLC pipeline e2e test)

## Monorepo Structure

This repository is an npm-workspaces monorepo with two workspace packages:

- `frontend/` — Vite + React app (public status page and internal dashboard)
- `backend/` — Node.js + Express API

The root `package.json` declares both directories in its `workspaces` array,
so a single `npm install` from the repo root installs dependencies for the
root, `frontend/`, and `backend/` together and links them under the root
`node_modules/`.

### Setup

```bash
npm install
```

Run this from the repo root — not from inside `frontend/` or `backend/`.
