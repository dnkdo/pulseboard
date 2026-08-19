// @vitest-environment jsdom
//
// Integration test (PLB-78 AC): boots the real Express app (server/src/app.js)
// against a fresh in-memory SQLite database that auto-seeds on import (see
// src/index.js's seedIfFresh), then renders the real "/status" route with
// real fetch calls against that live server — no mocked fetchComponents/
// fetchIncidents. This is the only test in the suite that exercises the
// actual server response shape end-to-end; every other status-page test
// mocks the API wrappers directly, so a server/client shape mismatch (like
// the state-vs-status field mismatch this ticket fixed in
// client/src/lib/api/incidents.js) would slip past them silently.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import AppRoutes from '../routes/index.jsx';
import app from '../../../server/src/app.js';

const SECTION_TESTIDS = ['status-banner', 'component-health-grid', 'active-incidents-list', 'past-incidents-list'];

let server;
let originalFetch;

beforeAll(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, (err) => (err ? reject(err) : resolve()));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  originalFetch = global.fetch;
  // Client code calls relative paths ('/api/incidents'); Node's fetch has
  // no notion of document.location to resolve those against, so this test
  // (the only one exercising a real network hop) rebases them onto the
  // ephemeral server's own origin.
  global.fetch = (path, options) => originalFetch(`${baseUrl}${path}`, options);
});

afterAll(async () => {
  global.fetch = originalFetch;
  await new Promise((resolve) => server.close(resolve));
});

describe('Public status page — fresh seeded database (PLB-78)', () => {
  it('AC: completes a single load cycle against the real, freshly-seeded API and renders all four sections non-empty', async () => {
    render(
      <MemoryRouter initialEntries={['/status']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    for (const testid of SECTION_TESTIDS) {
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId(testid)).toBeInTheDocument());
    }

    // Seed fixtures (src/data/seed/*.json) ship 6 components and 8
    // incidents spanning open/investigating/identified/resolved — every
    // section should have real, non-empty content, not an empty state.
    expect(screen.getByText('Core API')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('active-incidents-list')).getAllByTestId('incident-card').length,
    ).toBeGreaterThan(0);
    expect(
      within(screen.getByTestId('past-incidents-list')).getAllByTestId('past-incident-row').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByTestId('active-incidents-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('past-incidents-empty')).not.toBeInTheDocument();

    const sections = SECTION_TESTIDS.map((testid) => screen.getByTestId(testid));
    for (let i = 1; i < sections.length; i += 1) {
      expect(
        // eslint-disable-next-line no-bitwise
        sections[i - 1].compareDocumentPosition(sections[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('AC (PLB-103): groups the real seeded component payload into one heading per category, each tile once, no empty sections', async () => {
    render(
      <MemoryRouter initialEntries={['/status']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const grid = await screen.findByTestId('component-health-grid');

    // Seed fixtures (server/data/components.json) ship 6 components across
    // exactly 3 categories (API, Web, Infrastructure) — 2 components each.
    await waitFor(() => expect(within(grid).getAllByTestId('category-section')).toHaveLength(3));

    const headingNames = within(grid)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
      .sort();
    expect(headingNames).toEqual(['API', 'Infrastructure', 'Web']);

    // A category absent from the seed data must not render a section.
    expect(within(grid).queryByRole('heading', { name: 'Database' })).not.toBeInTheDocument();

    for (const name of [
      'Core API',
      'Authentication API',
      'Public Status Page',
      'Internal Dashboard',
      'Primary Database',
      'Load Balancer',
    ]) {
      expect(within(grid).getAllByText(name)).toHaveLength(1);
    }
  });

  it('AC: is reachable without authentication — no cookie/session is set and the real API never returns 401/403', async () => {
    expect(document.cookie).toBe('');

    render(
      <MemoryRouter initialEntries={['/status']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('status-banner')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
