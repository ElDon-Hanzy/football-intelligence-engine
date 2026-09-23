import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

const gw5Fixtures = [
  { match_id: 41, fpl_fixture_id: 41, kickoff_time: '2026-09-18T19:00:00Z', home_team: 'Liverpool', away_team: 'Everton', home_short: 'LIV', away_short: 'EVE', finished: false, home_score: null, away_score: null, prediction: { snapshot_id: 9101, source_change_id: 'C0284', captured_at: '2026-09-13T09:03:00Z', markets: { home_win: .58, draw: .24, away_win: .18 }, result_decision: 'HOME', direction_strength: 'STRONG', primary_environment: 'NORMAL_SCORING', scoring_environment_probabilities: { low: .2, normal: .55, high: .25 }, scoring_environment_state: 'PRIMARY', expected_total_goals: 2.8, representative_score: '2-1', representative_score_probability: .11, raw_modal_score: '1-1', raw_modal_probability: .12, decision_contract_version: 'c0284_fixture_decision_v01', chronology_and_coverage_valid: true, decision_hash: 'fixture-41', top_scorelines: [{ score: '2-1', prob: .11 }] } },
  { match_id: 42, fpl_fixture_id: 42, kickoff_time: '2026-09-19T14:00:00Z', home_team: 'Man Utd', away_team: 'Man City', home_short: 'MUN', away_short: 'MCI', finished: false, home_score: null, away_score: null, prediction: { snapshot_id: 9102, source_change_id: 'C0284', captured_at: '2026-09-13T09:03:00Z', markets: { home_win: .34, draw: .30, away_win: .36 }, result_decision: 'NO_MEANINGFUL_EDGE', direction_strength: 'NO_MEANINGFUL_EDGE', primary_environment: 'NORMAL_SCORING', scoring_environment_probabilities: { low: .28, normal: .37, high: .35 }, scoring_environment_state: 'BLENDED_NEAR_TIE', expected_total_goals: 3.1, representative_score: '1-1', representative_score_probability: .12, raw_modal_score: '1-1', raw_modal_probability: .12, decision_contract_version: 'c0284_fixture_decision_v01', chronology_and_coverage_valid: true, decision_hash: 'fixture-42', top_scorelines: [{ score: '1-1', prob: .12 }] } },
];

const topPlayers = [
  { id: 471, name: 'Mbeumo', position: 'MID', team: 'Man Utd', team_short: 'MUN', expected_points: 6.70, expected_minutes: 85.3, p_start: .94, p_blank: .33, p_10_plus: .224, p_15_plus: .058, p_20_plus: .014 },
  { id: 233, name: 'Haaland', position: 'FWD', team: 'Man City', team_short: 'MCI', expected_points: 6.66, expected_minutes: 88.1, p_start: .98, p_blank: .31, p_10_plus: .229, p_15_plus: .044, p_20_plus: .011 },
  { id: 470, name: 'B.Fernandes', position: 'MID', team: 'Man Utd', team_short: 'MUN', expected_points: 6.45, expected_minutes: 86.5, p_start: .97, p_blank: .35, p_10_plus: .210, p_15_plus: .045, p_20_plus: .010 },
  { id: 242, name: 'Guéhi', position: 'DEF', team: 'Man City', team_short: 'MCI', expected_points: 6.21, expected_minutes: 88.3, p_start: .98, p_blank: .41, p_10_plus: .165, p_15_plus: .028, p_20_plus: .005 },
];

const forwardPayload = {
  ok: true,
  gameweek: 5,
  prediction_run_id: 1366,
  model_version: '0.3',
  generated_at: '2026-09-12T18:00:02Z',
  top_players: topPlayers,
  captain_candidates: topPlayers.slice(0, 3),
  fixture_models: gw5Fixtures.map((fixture) => ({ match_id: fixture.match_id, home: fixture.home_team, away: fixture.away_team, kickoff_time: fixture.kickoff_time, headline_score: fixture.prediction.headline_score, headline_score_probability: fixture.prediction.headline_score_probability, markets: fixture.prediction.markets })),
  betting_recommendations: [
    { type: 'Correct score', match_id: 41, fixture: 'Liverpool vs Everton', selection: '2-1', probability: .11, home_lambda: 1.9, away_lambda: 1.1 },
    { type: '1X2', match_id: 41, fixture: 'Liverpool vs Everton', selection: 'Liverpool win', probability: .58, home_lambda: 1.9, away_lambda: 1.1 },
    { type: 'O/U 2.5', match_id: 41, fixture: 'Liverpool vs Everton', selection: 'Over 2.5', probability: .61, home_lambda: 1.9, away_lambda: 1.1 },
    { type: 'BTTS', match_id: 42, fixture: 'Man Utd vs Man City', selection: 'BTTS Yes', probability: .66, home_lambda: 1.5, away_lambda: 1.6 },
  ],
};

const baselinePredictions = gw4ActualLiveFixture.players.map((player, index) => ({
  id: player.player_id,
  name: player.name,
  team: player.team,
  position: player.position,
  expected_points: 3.2 + (index % 5) * .7,
  expected_minutes: 70 + (index % 4) * 5,
  p_start: .85,
  p_blank: .45,
  p_10_plus: .08 + (index % 3) * .03,
  p_15_plus: .02,
  p_20_plus: .004,
}));

const gw5Fpl = {
  ok: true,
  gameweek: 5,
  prediction_run_id: 1366,
  generated_at: '2026-09-12T18:00:02Z',
  historical_projection_valid: true,
  snapshot_stage: 'FORWARD_PRE_DEADLINE',
  metadata_availability: { historical: false, current_metadata_not_backfilled_into_history: true },
  decision: null,
  squad: baselinePredictions,
  all_predictions: [...baselinePredictions, ...topPlayers.filter((row) => !baselinePredictions.some((base) => base.id === row.id)).map((row) => ({ ...row }))],
  fixture_results: gw5Fixtures,
};

const gw5Workspace = {
  ...gw4WorkspaceFixture,
  gameweek: 5,
  lifecycle: 'PRE_DEADLINE',
  actual: { verification_status: 'NOT_VERIFIED', reason: 'Actual submitted team not verified', squad: null, starting_xi: null, bench_order: null, captain_player_id: null, vice_player_id: null, chip: null, manager_economy: null },
  recommendation: null,
  decision_snapshot: null,
  realized: {
    result_run_id: null,
    observed_at: null,
    is_final: false,
    fixtures: gw5Fixtures.map((fixture) => ({ match_id: fixture.match_id, fpl_fixture_id: fixture.fpl_fixture_id, kickoff_at: fixture.kickoff_time, phase: 'FUTURE', finished: false, home_team_id: fixture.match_id * 2, away_team_id: fixture.match_id * 2 + 1, home_team: fixture.home_team, away_team: fixture.away_team, home_score: null, away_score: null, result_source: 'DB_MATCHES', updated_at: '2026-09-13T09:03:00Z' })),
    player_actuals: [],
  },
  players: [],
};

function queryGw(url: string): number | null { const raw = new URL(url).searchParams.get('gw'); return raw == null ? null : Number(raw); }

async function mockForwardApis(page: Page) {
  await page.route('**/gameweek-status-api**', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, live_gameweek: 4, latest_intelligence_gameweek: 5, planning_horizon_gameweek: 8 }) }); });
  await page.route('**/fpl-v3-workspace-api**', async (route) => { const gw = queryGw(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw === 5 ? gw5Workspace : gw4WorkspaceFixture) }); });
  await page.route('**/human-insights-api**', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forwardPayload) }); });
  await page.route('**/fpl-v3-actual-live-api**', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw4ActualLiveFixture) }); });
  await page.route('**/fpl-api**', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw5Fpl) }); });
  await page.route('**/fixture-facts-api**', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, gameweek: 5, facts_available: false, fixtures: [] }) }); });
}

async function nav(page: Page, name: string) { await page.getByRole('link', { name, exact: true }).first().click(); }

test('upcoming GW intelligence is selectable before the active Gameweek completes', async ({ page }) => {
  await mockForwardApis(page);
  await page.goto('/?gw=5#home');
  const selector = page.getByLabel('Select Gameweek');
  await expect(selector).toHaveValue('5');
  await expect(selector.locator('option[value="4"]')).toHaveText('GW4 · Live');
  await expect(selector.locator('option[value="5"]')).toHaveText('GW5 · Upcoming');
  await expect(selector.locator('option[value="8"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Strongest 4 initial projections' })).toBeVisible();
  await expect(page.getByText('Mbeumo', { exact: true }).first()).toBeVisible();

  await nav(page, 'FPL');
  await expect(page.getByRole('heading', { name: 'Your next Gameweek' })).toBeVisible();
  await expect(page.getByText('Final plan pending', { exact: true })).toBeVisible();
  await expect(page.getByText('Baseline XI xPTS', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My verified GW4 team' }).click();
  await expect(page.locator('.v3-player-card')).toHaveCount(15);

  await nav(page, 'Matches');
  await expect(page.getByRole('heading', { name: 'Match center' })).toBeVisible();
  await expect(page.locator('.v3-match-card')).toHaveCount(gw5Fixtures.length);

  await nav(page, 'Markets');
  await expect(page.getByRole('heading', { name: 'Four core market predictions' })).toBeVisible();
  await expect(page.locator('.v3-market-card')).toHaveCount(4);

  await nav(page, 'Insights');
  await expect(page.getByRole('heading', { name: 'Strongest 4 initial projections' })).toBeVisible();
  await expect(page.locator('.v3-player-intel-card')).toHaveCount(4);
  await expect(page.getByText('Guéhi', { exact: true })).toBeVisible();
});

test('upcoming GW surfaces remain accessible and responsive', async ({ page }) => {
  await mockForwardApis(page); await page.goto('/?gw=5#insights');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
