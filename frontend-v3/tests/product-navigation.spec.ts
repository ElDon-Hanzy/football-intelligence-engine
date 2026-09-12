import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

const currentFixtures = [
  {
    match_id: 1,
    fpl_fixture_id: 1,
    kickoff_time: '2026-09-12T14:00:00Z',
    home_team: 'Chelsea',
    away_team: 'Hull City',
    home_short: 'CHE',
    away_short: 'HUL',
    finished: true,
    home_score: 2,
    away_score: 2,
    prediction: {
      snapshot_id: 9001,
      source_change_id: 'C0166',
      captured_at: '2026-09-12T12:00:00Z',
      markets: { home_win: 0.58, draw: 0.25, away_win: 0.17 },
      headline_score: '2-1',
      headline_score_probability: 0.12,
      top_scorelines: [{ score: '2-1', prob: 0.12 }, { score: '1-1', prob: 0.11 }],
    },
  },
  {
    match_id: 2,
    fpl_fixture_id: 2,
    kickoff_time: '2026-09-12T19:00:00Z',
    home_team: 'Sunderland',
    away_team: 'Arsenal',
    home_short: 'SUN',
    away_short: 'ARS',
    finished: false,
    home_score: 0,
    away_score: 1,
    prediction: {
      snapshot_id: 9002,
      source_change_id: 'C0166',
      captured_at: '2026-09-12T12:00:00Z',
      markets: { home_win: 0.18, draw: 0.23, away_win: 0.59 },
      headline_score: '1-2',
      headline_score_probability: 0.1,
      top_scorelines: [{ score: '1-2', prob: 0.1 }],
    },
  },
  {
    match_id: 3,
    fpl_fixture_id: 3,
    kickoff_time: '2026-09-13T15:30:00Z',
    home_team: 'Man Utd',
    away_team: 'Man City',
    home_short: 'MUN',
    away_short: 'MCI',
    finished: false,
    home_score: null,
    away_score: null,
    prediction: {
      snapshot_id: 9003,
      source_change_id: 'C0166',
      captured_at: '2026-09-12T12:00:00Z',
      markets: { home_win: 0.34, draw: 0.3, away_win: 0.36 },
      headline_score: '1-1',
      headline_score_probability: 0.115,
      top_scorelines: [{ score: '1-1', prob: 0.115 }],
    },
  },
];

const historicalIndex = {
  ok: true,
  gameweek: 4,
  available_gameweeks: [
    { gameweek: 1, historical_projection_valid: false },
    { gameweek: 2, historical_projection_valid: true },
    { gameweek: 3, historical_projection_valid: true },
    { gameweek: 4, historical_projection_valid: true },
  ],
  fixture_results: currentFixtures,
};

const historicalGw3 = {
  ok: true,
  gameweek: 3,
  prediction_run_id: 1274,
  generated_at: '2026-09-04T17:00:00.604443+00:00',
  historical_projection_valid: true,
  snapshot_stage: 'HISTORICAL_FROZEN',
  metadata_availability: { historical: true, current_metadata_not_backfilled_into_history: true },
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
    { match_id: 21, kickoff_time: '2026-09-04T19:00:00+00:00', home_team: 'Ipswich Town', away_team: 'Liverpool', finished: true, home_score: 0, away_score: 2, prediction: { markets: { home_win: 0.2225, draw: 0.2192, away_win: 0.5573 } } },
    { match_id: 22, kickoff_time: '2026-09-05T11:30:00+00:00', home_team: 'Newcastle', away_team: 'Bournemouth', finished: true, home_score: 2, away_score: 2, prediction: { markets: { home_win: 0.3882, draw: 0.2278, away_win: 0.3832 } } },
  ],
};

const fixtureFacts = {
  ok: true,
  gameweek: 4,
  facts_available: true,
  evidence_source: 'test',
  snapshot_run: { id: 1, as_of_gameweek: 4 },
  fixtures: currentFixtures.map((fixture) => ({
    match_id: fixture.match_id,
    gameweek: 4,
    kickoff_time: fixture.kickoff_time,
    alignment_basis: { snapshot_id: fixture.prediction.snapshot_id, captured_at: fixture.prediction.captured_at, source_change_id: fixture.prediction.source_change_id },
    modal_facts: [
      { id: fixture.match_id * 10 + 1, fact_type: 'FORM', usefulness_score: 0.9, alignment: 'SUPPORTS', one_liner: 'Recent attacking process supports the leading side.', evidence_cutoff: fixture.prediction.captured_at },
      { id: fixture.match_id * 10 + 2, fact_type: 'RISK', usefulness_score: 0.8, alignment: 'CONTRADICTS', one_liner: 'Transition exposure remains a credible counterpoint.', evidence_cutoff: fixture.prediction.captured_at },
    ],
  })),
};

async function mockProductApis(page: Page) {
  await page.route('**/fpl-v3-workspace-api**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw4WorkspaceFixture) });
  });
  await page.route('**/fpl-v3-actual-live-api**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw4ActualLiveFixture) });
  });
  await page.route('**/fixture-facts-api**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureFacts) });
  });
  await page.route('**/fpl-api**', async (route) => {
    const url = new URL(route.request().url());
    const gw = Number(url.searchParams.get('gw') ?? 0);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw === 3 ? historicalGw3 : historicalIndex) });
  });
}

async function nav(page: Page, view: 'home' | 'fpl' | 'matches' | 'insights' | 'history') {
  const label = view === 'fpl' ? 'FPL' : `${view.charAt(0).toUpperCase()}${view.slice(1)}`;
  await page.getByRole('link', { name: label, exact: true }).click();
}

async function assertNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
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
  await expect(page.locator('.v3-match-card')).toHaveCount(currentFixtures.length);
  await expect(page.getByText('Chelsea win', { exact: true })).toBeVisible();
  await expect(page.getByText('2-1', { exact: true }).first()).toBeVisible();

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

test('matchup modal exposes frozen 1X2, score call and result confirmation', async ({ page }) => {
  await mockProductApis(page);
  await page.goto('/#matches');
  const chelsea = page.locator('.v3-match-card').filter({ hasText: 'Chelsea' }).first();
  await chelsea.getByRole('button', { name: /Open matchup intelligence/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('1X2 thesis', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Score call', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Result confirmation', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /Counterpoints \/ risks/ })).toBeVisible();
  await expect(dialog.getByText('Transition exposure remains a credible counterpoint.', { exact: true })).toBeVisible();
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
