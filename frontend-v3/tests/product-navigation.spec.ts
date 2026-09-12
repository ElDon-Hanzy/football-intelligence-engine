import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

const historicalIndex = {
  ok: true,
  gameweek: 4,
  available_gameweeks: [
    { gameweek: 1, historical_projection_valid: false },
    { gameweek: 2, historical_projection_valid: true },
    { gameweek: 3, historical_projection_valid: true },
    { gameweek: 4, historical_projection_valid: true },
  ],
  fixture_results: [],
};

const historicalGw3 = {
  ok: true,
  gameweek: 3,
  prediction_run_id: 1274,
  generated_at: '2026-09-04T17:00:00.604443+00:00',
  historical_projection_valid: true,
  snapshot_stage: 'HISTORICAL_FROZEN',
  metadata_availability: {
    historical: true,
    current_metadata_not_backfilled_into_history: true,
  },
  available_gameweeks: historicalIndex.available_gameweeks,
  decision: {
    captain_player_id: 471,
    vice_player_id: 470,
    starting_xi: [
      { id: 112, name: 'Verbruggen', team: 'Brighton', position: 'GKP', xPts: 4.1, p10: 0.004 },
      { id: 471, name: 'Mbeumo', team: 'Man Utd', position: 'MID', xPts: 6.7, p10: 0.232 },
      { id: 470, name: 'B.Fernandes', team: 'Man Utd', position: 'MID', xPts: 6.6, p10: 0.225 },
    ],
    bench: [],
    recommendations: { formation: '3-5-2' },
  },
  fixture_results: [
    {
      match_id: 21,
      kickoff_time: '2026-09-04T19:00:00+00:00',
      home_team: 'Ipswich Town',
      away_team: 'Liverpool',
      finished: true,
      home_score: 0,
      away_score: 2,
      prediction: { markets: { home_win: 0.2225, draw: 0.2192, away_win: 0.5573 } },
    },
    {
      match_id: 22,
      kickoff_time: '2026-09-05T11:30:00+00:00',
      home_team: 'Newcastle',
      away_team: 'Bournemouth',
      finished: true,
      home_score: 2,
      away_score: 2,
      prediction: { markets: { home_win: 0.3882, draw: 0.2278, away_win: 0.3832 } },
    },
  ],
};

async function mockProductApis(page: Page) {
  await page.route('**/fpl-v3-workspace-api**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(gw4WorkspaceFixture),
    });
  });
  await page.route('**/fpl-api**', async (route) => {
    const url = new URL(route.request().url());
    const gw = Number(url.searchParams.get('gw') ?? 0);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(gw === 3 ? historicalGw3 : historicalIndex),
    });
  });
}

async function nav(page: Page, view: 'home' | 'fpl' | 'matches' | 'insights' | 'history') {
  const label = view === 'fpl' ? 'FPL' : `${view.charAt(0).toUpperCase()}${view.slice(1)}`;
  await page.getByRole('link', { name: label, exact: true }).click();
}

async function assertNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('all five V3 navigation destinations render real product surfaces', async ({ page }) => {
  await mockProductApis(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();

  await nav(page, 'home');
  await expect(page.getByRole('heading', { name: 'Football intelligence, distilled to what matters now.' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-active-view', 'home');

  await nav(page, 'matches');
  await expect(page.getByRole('heading', { name: 'Every fixture in its real state.' })).toBeVisible();
  await expect(page.locator('.v3-match-card')).toHaveCount(gw4WorkspaceFixture.realized.fixtures.length);

  await nav(page, 'insights');
  await expect(page.getByRole('heading', { name: 'Decision intelligence without pretending noise is certainty.' })).toBeVisible();
  await expect(page.getByText('Highest P10+ inside the recommended squad')).toBeVisible();

  await nav(page, 'history');
  await expect(page.getByRole('heading', { name: 'Judge the decision from the evidence that existed then.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What the engine knew before the deadline' })).toBeVisible();
  await expect(page.getByText('GW3 · HISTORICAL_FROZEN')).toBeVisible();

  await nav(page, 'fpl');
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
});

test('hash routes survive direct entry and browser history', async ({ page }) => {
  await mockProductApis(page);
  await page.goto('/#matches');
  await expect(page.getByRole('heading', { name: 'Every fixture in its real state.' })).toBeVisible();

  await nav(page, 'insights');
  await expect(page.locator('main')).toHaveAttribute('data-active-view', 'insights');
  await page.goBack();
  await expect(page.locator('main')).toHaveAttribute('data-active-view', 'matches');
});

test('all non-FPL V3 pages stay responsive and avoid serious accessibility violations', async ({ page }) => {
  await mockProductApis(page);

  for (const view of ['home', 'matches', 'insights', 'history'] as const) {
    await page.goto(`/#${view}`);
    await expect(page.locator('main')).toHaveAttribute('data-active-view', view);
    if (view === 'history') await expect(page.getByText('GW3 · HISTORICAL_FROZEN')).toBeVisible();
    await assertNoOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
    expect(blocking, `${view} accessibility`).toEqual([]);
  }
});
