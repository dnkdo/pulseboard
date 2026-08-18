// @vitest-environment jsdom
//
// AC2: "All public status page components use the light-theme token set,
// not the internal dashboard's dark-theme tokens." Every other theme test in
// this suite is a static source-file scan (severityAudit.js,
// publicPageThemeAudit.js, severityTokenScope.test.js, statusPageTokens.test.js)
// — none of them mount the real component tree and check what actually lands
// in the DOM, so a CSS Modules class that never gets applied, or a style
// rule that gets overridden, would slip past a source scan undetected. This
// test renders the full StatusPage with vitest's `css: true` (client/vitest.config.js)
// so CSS Modules are really injected into jsdom, then reads back
// getComputedStyle() and asserts it resolves to the exact -light hex values
// from .adlc/design/tokens.json — and never to a dark-only one.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import StatusPage from './StatusPage.jsx';
import { fetchIncidents } from '../lib/api/incidents.js';
import { fetchComponents } from '../lib/api/components.js';
import headerStyles from '../components/StatusPageHeader.module.css';
import tileStyles from '../components/HealthTile.module.css';
import cardStyles from '../components/IncidentCard.module.css';
import pastStyles from '../components/PastIncidentsList.module.css';
import { DARK_ONLY_HEX } from '../theme/publicPageThemeAudit.js';

vi.mock('../lib/api/incidents.js', () => ({ fetchIncidents: vi.fn() }));
vi.mock('../lib/api/components.js', () => ({ fetchComponents: vi.fn() }));

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const designTokens = JSON.parse(
  readFileSync(path.resolve(moduleDir, '../../../.adlc/design/tokens.json'), 'utf-8'),
);

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  return `rgb(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255})`;
}

const LIGHT = {
  surfacePrimary: hexToRgb(designTokens.colors['surface-primary-light']),
  surfaceSecondary: hexToRgb(designTokens.colors['surface-secondary-light']),
  surfaceTertiary: hexToRgb(designTokens.colors['surface-tertiary-light']),
  textPrimary: hexToRgb(designTokens.colors['text-primary-light']),
  textMuted: hexToRgb(designTokens.colors['text-muted-light']),
  border: hexToRgb(designTokens.colors['border-light']),
};

const DARK_ONLY_RGB = new Set(DARK_ONLY_HEX.map(hexToRgb));

// Deliberately includes an active SEV1 incident and a resolved SEV2 one —
// if chrome coloring were ever wired conditionally off incident data (e.g.
// "use the dashboard's dark surface when a SEV1 is active"), this dataset
// is what would expose it; a page with no incidents at all could pass by
// accident.
const INCIDENTS_WITH_SEV1 = [
  {
    id: 'inc-1',
    title: 'Checkout API returning 500s',
    severity: 'SEV1',
    status: 'investigating',
    affectedComponents: ['api'],
    resolvedAt: null,
  },
  {
    id: 'inc-2',
    title: 'Elevated CDN latency',
    severity: 'SEV2',
    status: 'resolved',
    affectedComponents: ['cdn'],
    resolvedAt: '2026-08-10T12:00:00.000Z',
  },
];

const COMPONENTS = [
  { id: 'api', name: 'API', healthState: 'operational', uptimePercent: 99.95 },
  { id: 'db', name: 'Database', healthState: 'major_outage', uptimePercent: 92.1 },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderStatusPage({ incidents, components }) {
  fetchIncidents.mockResolvedValue(incidents);
  fetchComponents.mockResolvedValue(components);
  const utils = render(<StatusPage />);
  await waitFor(() => expect(screen.queryAllByText(/Loading/i)).toHaveLength(0));
  return utils;
}

describe('StatusPage renders the real light-theme token set (AC2)', () => {
  it('injects real CSS Modules class names into the jsdom tree (not just resolvable-but-unapplied selectors)', async () => {
    const { container } = await renderStatusPage({
      incidents: INCIDENTS_WITH_SEV1,
      components: COMPONENTS,
    });

    // Guards the getComputedStyle assertions below: if `css: true` weren't
    // wired up (client/vitest.config.js) or the CSS Modules class names
    // never made it onto the actual DOM elements, querySelector(`.${x}`)
    // would return null here and every downstream getComputedStyle() call
    // would throw on a null element instead of silently reading defaults.
    const header = container.querySelector(`.${headerStyles.header}`);
    expect(header).not.toBeNull();
    expect(header.className.split(' ')).toContain(headerStyles.header);

    const tile = container.querySelector(`.${tileStyles.tile}`);
    expect(tile).not.toBeNull();
    expect(tile.className.split(' ')).toContain(tileStyles.tile);
  });

  it('applies the exact -light hex values from the design contract to chrome elements, with a SEV1 incident active', async () => {
    const { container } = await renderStatusPage({
      incidents: INCIDENTS_WITH_SEV1,
      components: COMPONENTS,
    });

    const header = container.querySelector(`.${headerStyles.header}`);
    expect(getComputedStyle(header).backgroundColor).toBe(LIGHT.surfacePrimary);
    expect(getComputedStyle(header).borderBottomColor).toBe(LIGHT.border);
    expect(getComputedStyle(container.querySelector(`.${headerStyles.title}`)).color).toBe(
      LIGHT.textPrimary,
    );

    const tiles = container.querySelectorAll(`.${tileStyles.tile}`);
    expect(tiles).toHaveLength(COMPONENTS.length);
    tiles.forEach((tile) => {
      expect(getComputedStyle(tile).backgroundColor).toBe(LIGHT.surfacePrimary);
      expect(getComputedStyle(tile).borderColor).toBe(LIGHT.border);
    });

    const card = screen.getByTestId('incident-card');
    expect(getComputedStyle(card).backgroundColor).toBe(LIGHT.surfaceSecondary);
    expect(getComputedStyle(container.querySelector(`.${cardStyles.title}`)).color).toBe(
      LIGHT.textPrimary,
    );

    const pastHeaderCell = container.querySelector(`.${pastStyles.header}`);
    expect(getComputedStyle(pastHeaderCell).backgroundColor).toBe(LIGHT.surfaceSecondary);
    expect(getComputedStyle(pastHeaderCell).color).toBe(LIGHT.textMuted);
  });

  it('never applies a dark-only design-contract color anywhere in the rendered tree', async () => {
    const { container } = await renderStatusPage({
      incidents: INCIDENTS_WITH_SEV1,
      components: COMPONENTS,
    });

    const violations = [];
    container.querySelectorAll('*').forEach((el) => {
      const computed = getComputedStyle(el);
      for (const property of ['backgroundColor', 'color', 'borderColor']) {
        if (DARK_ONLY_RGB.has(computed[property])) {
          violations.push({ tag: el.tagName, property, value: computed[property] });
        }
      }
    });

    expect(violations).toEqual([]);
  });

  it('renders identical chrome colors whether or not a SEV1 incident is active — chrome coloring is not data-conditional', async () => {
    const withIncident = await renderStatusPage({
      incidents: INCIDENTS_WITH_SEV1,
      components: COMPONENTS,
    });
    const headerBgWithIncident = getComputedStyle(
      withIncident.container.querySelector(`.${headerStyles.header}`),
    ).backgroundColor;
    const tileBgWithIncident = getComputedStyle(
      withIncident.container.querySelector(`.${tileStyles.tile}`),
    ).backgroundColor;
    cleanup();

    const withoutIncident = await renderStatusPage({ incidents: [], components: COMPONENTS });
    const headerBgWithoutIncident = getComputedStyle(
      withoutIncident.container.querySelector(`.${headerStyles.header}`),
    ).backgroundColor;
    const tileBgWithoutIncident = getComputedStyle(
      withoutIncident.container.querySelector(`.${tileStyles.tile}`),
    ).backgroundColor;

    expect(headerBgWithIncident).toBe(headerBgWithoutIncident);
    expect(headerBgWithIncident).toBe(LIGHT.surfacePrimary);
    expect(tileBgWithIncident).toBe(tileBgWithoutIncident);
    expect(tileBgWithIncident).toBe(LIGHT.surfacePrimary);
  });
});
