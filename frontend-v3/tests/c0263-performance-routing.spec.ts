import { expect, test } from '@playwright/test';

const catalog = { ok: true, live_gameweek: 4, latest_intelligence_gameweek: 5, planning_horizon_gameweek: 8 };
const fixture = {
  match_id: 31,
  fpl_fixture_id: 31,
  kickoff_time: '2026-09-13T18:00:00Z',
  home_team: 'Chelsea',
  away_team: 'Arsenal',
  home_short: 'CHE',
  away_short: 'ARS',
  finished: false,
  home_score: null,
  away_score: null,
  prediction: {
    snapshot_id: 9031,
    source_change_id: 'C0166',
    captured_at: '2026-09-12T12:00:00Z',
    markets: { home_win: .46, draw: .28, away_win: .26 },
    headline_score: '2-1',
    headline_score_probability: .12,
    top_scorelines: [{ score: '2-1', prob: .12 }],
  },
};
const fplGw4 = {
  ok: true,
  gameweek: 4,
  prediction_run_id: 1365,
  generated_at: '2026-09-12T11:02:01Z',
  historical_projection_valid: true,
  snapshot_stage: 'FINAL_WINDOW',
  metadata_availability: { historical: false, current_metadata_not_backfilled_into_history: true },
  decision: { starting_xi: [], bench: [], captain_player_id: null, vice_player_id: null },
  all_predictions: [],
  fixture_results: [fixture],
};
const marketsGw4 = {
  ok: true,
  gameweek: 4,
  prediction_run_id: 1365,
  generated_at: '2026-09-12T11:02:01Z',
  betting_recommendations: [
    { type: 'Correct score', match_id: 31, fixture: 'Chelsea vs Arsenal', selection: '2-1', probability: .12, home_lambda: 1.6, away_lambda: 1.2 },
    { type: '1X2', match_id: 31, fixture: 'Chelsea vs Arsenal', selection: 'Chelsea win', probability: .46, home_lambda: 1.6, away_lambda: 1.2 },
    { type: 'O/U 2.5', match_id: 31, fixture: 'Chelsea vs Arsenal', selection: 'Over 2.5', probability: .58, home_lambda: 1.6, away_lambda: 1.2 },
    { type: 'BTTS', match_id: 31, fixture: 'Chelsea vs Arsenal', selection: 'BTTS Yes', probability: .62, home_lambda: 1.6, away_lambda: 1.2 },
  ],
};

test('Matches renders primary predictions without workspace or fixture-facts on its critical path', async ({ page }) => {
  let workspaceRequests = 0;
  await page.route('**/gameweek-status-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  await page.route('**/fpl-v3-workspace-api**', async (route) => { workspaceRequests += 1; await route.abort(); });
  await page.route('**/fpl-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fplGw4) }));
  await page.route('**/fixture-facts-api**', async (route) => { await new Promise((resolve) => setTimeout(resolve, 3000)); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, gameweek: 4, facts_available: false, fixtures: [] }) }); });

  await page.goto('/#matches');
  await expect(page.getByRole('heading', { name: 'Match center' })).toBeVisible({ timeout: 1500 });
  await expect(page.locator('.v3-match-card')).toHaveCount(1);
  expect(workspaceRequests).toBe(0);
});

test('Markets requests its own contracts directly and does not wait for FPL workspace', async ({ page }) => {
  let workspaceRequests = 0;
  await page.route('**/gameweek-status-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  await page.route('**/fpl-v3-workspace-api**', async (route) => { workspaceRequests += 1; await route.abort(); });
  await page.route('**/fpl-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fplGw4) }));
  await page.route('**/human-insights-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(marketsGw4) }));

  await page.goto('/#markets');
  await expect(page.getByRole('heading', { name: 'Four core market predictions' })).toBeVisible({ timeout: 1500 });
  await expect(page.locator('.v3-market-card')).toHaveCount(4);
  expect(workspaceRequests).toBe(0);
});

test('History requests selected current GW explicitly instead of defaulting to planning horizon', async ({ page }) => {
  const requested: string[] = [];
  await page.route('**/gameweek-status-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  await page.route('**/fpl-api**', async (route) => { requested.push(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fplGw4) }); });

  await page.goto('/#history');
  await expect(page.getByText('Gameweek 4 review', { exact: true })).toBeVisible();
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.every((url) => new URL(url).searchParams.get('gw') === '4')).toBe(true);
  await expect(page.getByLabel('Select Gameweek').locator('option[value="8"]')).toHaveCount(0);
});
