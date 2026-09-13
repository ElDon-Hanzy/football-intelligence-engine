import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

const currentFixtures = [
  { match_id: 1, fpl_fixture_id: 1, kickoff_time: '2026-09-12T14:00:00Z', home_team: 'Chelsea', away_team: 'Hull City', home_short: 'CHE', away_short: 'HUL', finished: true, home_score: 2, away_score: 2, prediction: { snapshot_id: 9001, source_change_id: 'C0166', captured_at: '2026-09-12T12:00:00Z', markets: { home_win: .58, draw: .25, away_win: .17 }, headline_score: '2-1', headline_score_probability: .12, top_scorelines: [{ score: '2-1', prob: .12 }, { score: '1-1', prob: .11 }] } },
  { match_id: 2, fpl_fixture_id: 2, kickoff_time: '2026-09-12T19:00:00Z', home_team: 'Sunderland', away_team: 'Arsenal', home_short: 'SUN', away_short: 'ARS', finished: false, home_score: 0, away_score: 1, prediction: { snapshot_id: 9002, source_change_id: 'C0166', captured_at: '2026-09-12T12:00:00Z', markets: { home_win: .18, draw: .23, away_win: .59 }, headline_score: '1-2', headline_score_probability: .10, top_scorelines: [{ score: '1-2', prob: .10 }] } },
  { match_id: 3, fpl_fixture_id: 3, kickoff_time: '2026-09-13T15:30:00Z', home_team: 'Man Utd', away_team: 'Man City', home_short: 'MUN', away_short: 'MCI', finished: false, home_score: null, away_score: null, prediction: { snapshot_id: 9003, source_change_id: 'C0166', captured_at: '2026-09-12T12:00:00Z', markets: { home_win: .34, draw: .30, away_win: .36 }, headline_score: '1-1', headline_score_probability: .115, top_scorelines: [{ score: '1-1', prob: .115 }] } },
];

const historicalPlayersGw3 = [
  [112, 'Verbruggen', 'Brighton', 'GKP', 4.052, .0039, 3],
  [426, "O'Reilly", 'Man City', 'DEF', 6.32, .1544, 0],
  [514, 'N.Williams', "Nott'm Forest", 'DEF', 5.018, .0705, 7],
  [461, 'Dalot', 'Man Utd', 'DEF', 3.757, .0437, 1],
  [471, 'Mbeumo', 'Man Utd', 'MID', 6.735, .2319, 8],
  [470, 'B.Fernandes', 'Man Utd', 'MID', 6.585, .2252, 2],
  [436, 'Semenyo', 'Man City', 'MID', 4.849, .0806, 6],
  [29, 'Tzolis', 'Arsenal', 'MID', 4.773, .0854, 5],
  [161, 'Palmer', 'Chelsea', 'MID', 3.542, .0314, 1],
  [417, 'Isak', 'Liverpool', 'FWD', 5.499, .1646, 13],
  [170, 'João Pedro', 'Chelsea', 'FWD', 4.172, .0577, 1],
].map(([id, name, team, position, xPts, p10, actual]) => ({ id, name, team, position, xPts, p10, p15: .02, p20: .004, actual }));
const historicalBenchGw3 = [
  { id: 60, name: 'Forster', team: 'Bournemouth', position: 'GKP', xPts: .758, p10: .001, p15: 0, p20: 0 },
  { id: 11, name: 'Mosquera', team: 'Arsenal', position: 'DEF', xPts: 3.365, p10: .02, p15: .002, p20: 0 },
  { id: 188, name: 'van Ewijk', team: 'Coventry', position: 'DEF', xPts: 1.784, p10: .005, p15: 0, p20: 0 },
  { id: 290, name: 'Kusi-Asare', team: 'Fulham', position: 'FWD', xPts: 1.601, p10: .002, p15: 0, p20: 0 },
];
const historicalGw3 = {
  ok: true, gameweek: 3, prediction_run_id: 1274, generated_at: '2026-09-04T17:00:00.604443+00:00', historical_projection_valid: true, snapshot_stage: 'HISTORICAL_FROZEN', metadata_availability: { historical: true, current_metadata_not_backfilled_into_history: true },
  available_gameweeks: [{ gameweek: 1, historical_projection_valid: false }, { gameweek: 2, historical_projection_valid: true }, { gameweek: 3, historical_projection_valid: true }, { gameweek: 4, historical_projection_valid: true }],
  decision: { captain_player_id: 471, vice_player_id: 470, starting_xi: historicalPlayersGw3.map(({ actual: _actual, ...player }) => player), bench: historicalBenchGw3, recommendations: { formation: '3-5-2' } },
  all_predictions: historicalPlayersGw3.map((player) => ({ id: player.id, name: player.name, team: player.team, position: player.position, expected_points: player.xPts, expected_minutes: 85, p_10_plus: player.p10, actual: { player_id: player.id, total_points: player.actual, minutes: player.actual === 0 ? 0 : 90 }, actual_status: 'final' })),
  fixture_results: [
    { match_id: 21, fpl_fixture_id: 21, kickoff_time: '2026-09-04T19:00:00+00:00', home_team: 'Ipswich Town', away_team: 'Liverpool', home_short: 'IPS', away_short: 'LIV', finished: true, home_score: 0, away_score: 2, prediction: { snapshot_id: 9021, captured_at: '2026-09-04T17:00:00Z', source_change_id: 'C0166', markets: { home_win: .2225, draw: .2192, away_win: .5573 }, headline_score: '0-2', top_scorelines: [{ score: '0-2', prob: .13 }] } },
    { match_id: 22, fpl_fixture_id: 22, kickoff_time: '2026-09-05T11:30:00+00:00', home_team: 'Newcastle', away_team: 'Bournemouth', home_short: 'NEW', away_short: 'BOU', finished: true, home_score: 2, away_score: 2, prediction: { snapshot_id: 9022, captured_at: '2026-09-04T17:00:00Z', source_change_id: 'C0166', markets: { home_win: .3882, draw: .2278, away_win: .3832 }, headline_score: '1-1', top_scorelines: [{ score: '1-1', prob: .12 }] } },
  ],
};

const evidenceById = new Map((gw4WorkspaceFixture.decision_snapshot?.player_evidence ?? []).map((row) => [row.player_id, row]));
const squadById = new Map((gw4WorkspaceFixture.recommendation?.squad ?? []).map((row) => [row.player_id, row]));
const historicalGw4 = {
  ok: true, gameweek: 4, prediction_run_id: 1365, generated_at: '2026-09-12T11:02:01Z', historical_projection_valid: true, snapshot_stage: 'FINAL_WINDOW', metadata_availability: { historical: false, current_metadata_not_backfilled_into_history: true }, available_gameweeks: historicalGw3.available_gameweeks,
  decision: {
    captain_player_id: gw4WorkspaceFixture.recommendation?.captain_player_id,
    vice_player_id: gw4WorkspaceFixture.recommendation?.vice_player_id,
    starting_xi: (gw4WorkspaceFixture.recommendation?.starting_xi ?? []).map((id) => historicalPlayerFromGw4(id)),
    bench: (gw4WorkspaceFixture.recommendation?.bench_order ?? []).map((id) => historicalPlayerFromGw4(id)),
    recommendations: { formation: '3-5-2' },
  },
  all_predictions: [],
  fixture_results: currentFixtures,
};

const actualProjectionExtras = [
  [8, 5.471728, 74.76, .10817], [116, 4.936309, 72.38, .138094], [161, 4.726143, 84.12, .086017], [426, 4.227585, 68.38, .07412], [437, 1.709626, 17.9916, .018132],
].map(([player_id, expected_points, expected_minutes, p_10_plus]) => ({ player_id, status: 'CAPTURED', captured_at: '2026-09-12T11:02:01Z', expected_points, expected_minutes, p_10_plus }));
const enrichedWorkspace = { ...gw4WorkspaceFixture, decision_snapshot: gw4WorkspaceFixture.decision_snapshot ? { ...gw4WorkspaceFixture.decision_snapshot, player_evidence: [...gw4WorkspaceFixture.decision_snapshot.player_evidence, ...actualProjectionExtras] } : null };

const fixtureFacts = { ok: true, gameweek: 4, facts_available: true, evidence_source: 'test', snapshot_run: { id: 1, as_of_gameweek: 4 }, fixtures: currentFixtures.map((fixture) => ({ match_id: fixture.match_id, gameweek: 4, kickoff_time: fixture.kickoff_time, alignment_basis: { snapshot_id: fixture.prediction.snapshot_id, captured_at: fixture.prediction.captured_at, source_change_id: fixture.prediction.source_change_id }, modal_facts: [{ id: fixture.match_id * 10 + 1, fact_type: 'FORM', usefulness_score: .9, alignment: 'SUPPORTS', one_liner: 'Recent attacking process supports the leading side.' }, { id: fixture.match_id * 10 + 2, fact_type: 'RISK', usefulness_score: .8, alignment: 'CONTRADICTS', one_liner: 'Transition exposure remains a credible counterpoint.' }] })) };
const coreMarkets = { ok: true, gameweek: 4, prediction_run_id: 1365, model_version: '0.3', generated_at: '2026-09-12T12:00:00Z', betting_recommendations: [{ type: 'Correct score', match_id: 1, fixture: 'Chelsea vs Hull City', selection: '2-1', probability: .12, home_lambda: 1.8, away_lambda: 1.1 }, { type: '1X2', match_id: 1, fixture: 'Chelsea vs Hull City', selection: 'Draw', probability: .25, home_lambda: 1.8, away_lambda: 1.1 }, { type: 'O/U 2.5', match_id: 2, fixture: 'Sunderland vs Arsenal', selection: 'Over 2.5', probability: .63, home_lambda: .9, away_lambda: 1.7 }, { type: 'BTTS', match_id: 3, fixture: 'Man Utd vs Man City', selection: 'BTTS Yes', probability: .66, home_lambda: 1.5, away_lambda: 1.6 }] };

function historicalPlayerFromGw4(id: number) {
  const squad = squadById.get(id); const evidence = evidenceById.get(id);
  return { id, name: squad?.name ?? `Player ${id}`, team: squad?.team ?? null, position: squad?.position ?? null, xPts: evidence?.expected_points ?? null, p10: evidence?.p_10_plus ?? null, p15: null, p20: null };
}
function requestedGameweek(url: string) { const value = Number(new URL(url).searchParams.get('gw') ?? 0); return value >= 1 && value <= 38 ? value : 4; }
function workspaceFor(gameweek: number) { return { ...enrichedWorkspace, gameweek, lifecycle: gameweek === 4 ? 'POST_DEADLINE_ACTIVE' : 'GW_COMPLETE' }; }

async function mockProductApis(page: Page) {
  await page.route('**/gameweek-status-api**', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, live_gameweek: 4, latest_intelligence_gameweek: 5, planning_horizon_gameweek: 8 }) }); });
  await page.route('**/fpl-v3-workspace-api**', async (route) => { const gw = requestedGameweek(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(workspaceFor(gw)) }); });
  await page.route('**/fpl-v3-actual-live-api**', async (route) => { const gw = requestedGameweek(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...gw4ActualLiveFixture, gameweek: gw }) }); });
  await page.route('**/fixture-facts-api**', async (route) => { const gw = requestedGameweek(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...fixtureFacts, gameweek: gw }) }); });
  await page.route('**/human-insights-api**', async (route) => { const gw = requestedGameweek(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...coreMarkets, gameweek: gw, prediction_run_id: gw === 3 ? 1274 : 1365 }) }); });
  await page.route('**/fpl-api**', async (route) => { const gw = requestedGameweek(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw === 3 ? historicalGw3 : historicalGw4) }); });
}

async function nav(page: Page, view: 'home' | 'fpl' | 'matches' | 'markets' | 'insights' | 'history') { const label = view === 'fpl' ? 'FPL' : `${view.charAt(0).toUpperCase()}${view.slice(1)}`; await page.getByRole('link', { name: label, exact: true }).first().click(); }
async function assertNoOverflow(page: Page) { const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })); expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1); }

test('all six V3 navigation destinations render compact consumer surfaces', async ({ page }) => {
  await mockProductApis(page); await page.goto('/'); await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
  await nav(page, 'home'); await expect(page.getByRole('heading', { name: 'Command center' })).toBeVisible(); await expect(page.locator('.v3-fixture-mini-card')).toHaveCount(enrichedWorkspace.realized.fixtures.length);
  await nav(page, 'matches'); await expect(page.getByRole('heading', { name: 'Match center' })).toBeVisible(); await expect(page.locator('.v3-match-card')).toHaveCount(currentFixtures.length); await expect(page.locator('.v3-data-table')).toHaveCount(0);
  await nav(page, 'markets'); await expect(page.getByRole('heading', { name: 'Four core market predictions' })).toBeVisible(); await expect(page.locator('.v3-market-card')).toHaveCount(4);
  await nav(page, 'insights'); await expect(page.getByRole('heading', { name: 'Player intelligence' })).toBeVisible(); await expect(page.locator('.v3-player-intel-card')).toHaveCount(enrichedWorkspace.recommendation?.squad.length ?? 0); await expect(page.locator('.v3-data-table')).toHaveCount(0);
  await nav(page, 'history'); await expect(page.getByRole('heading', { name: 'History' })).toBeVisible(); await expect(page.getByText('Gameweek 4 review', { exact: true })).toBeVisible(); await expect(page.locator('.v3-history-player-card').count()).resolves.toBeGreaterThan(0); await expect(page.locator('.v3-data-table')).toHaveCount(0);
  await nav(page, 'fpl'); await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
});

test('global Gameweek switcher persists across every V3 page and uses historical contracts', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#home');
  const selector = page.getByLabel('Select Gameweek');
  await expect(selector).toHaveValue('4');
  await expect(selector.locator('option[value="8"]')).toHaveCount(0);
  await selector.selectOption('3');
  await expect(page).toHaveURL(/\?gw=3#home$/);
  await expect(page.locator('main')).toHaveAttribute('data-gameweek', '3');
  await expect(page.getByText('Gameweek 3 · historical review', { exact: true })).toBeVisible();

  await nav(page, 'fpl'); await expect(page.getByText('Gameweek 3 review', { exact: true })).toBeVisible(); await expect(page.getByRole('region', { name: 'Projected xPTS versus Actual PTS' })).toContainText('47');
  await nav(page, 'matches'); await expect(page.getByText('Gameweek 3', { exact: true })).toBeVisible();
  await nav(page, 'markets'); await expect(page.getByText('Gameweek 3 · frozen predictions', { exact: true })).toBeVisible();
  await nav(page, 'insights'); await expect(page.getByText('Gameweek 3 · frozen decision-time projections', { exact: true })).toBeVisible();
  await nav(page, 'history'); await expect(page.getByText('Gameweek 3 review', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\?gw=3#history$/);

  await selector.selectOption('4');
  await expect(page).toHaveURL(/#history$/);
  await expect(page.locator('main')).toHaveAttribute('data-gameweek', '4');
  await expect(page.getByText('Gameweek 4 review', { exact: true })).toBeVisible();
});

test('FPL makes full engine-versus-actual scoring primary and demotes engineering metadata', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#fpl');
  const scorecard = page.getByRole('region', { name: 'Engine versus actual Gameweek scoring' });
  await expect(scorecard.locator('[data-metric="xpts"] strong')).toHaveText('20');
  await expect(scorecard.locator('[data-metric="xpts"] small')).toContainText('xPts 62.4');
  await expect(scorecard.locator('[data-metric="actual"] strong')).toHaveText('31');
  await expect(scorecard.locator('[data-metric="actual"] small')).toContainText('xPts 61.0');
  await expect(scorecard.locator('[data-metric="delta"] strong')).toHaveText('+11');
  await expect(scorecard.locator('[data-metric="delta"] small')).toContainText('actual minus engine');
  await expect(scorecard).toContainText('Captain multiplier and automatic substitutions are applied in both scenarios');
  await expect(page.locator('.v3-lifecycle-strip')).toHaveCount(0);
  const details = page.locator('details.v3-data-details');
  await expect(details.getByText('Actual source', { exact: true })).toBeHidden();
  await details.getByText('Data details', { exact: true }).click();
  await expect(details.getByText('FPL locked picks', { exact: true })).toBeVisible();
  await expect(details.getByText('Run #1365', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'My team' }).click();
  const joao = page.locator('.v3-player-card').filter({ hasText: 'João Pedro' }).first();
  await expect(joao).toContainText('12 pts');
  await expect(joao).toContainText('5.5 xPts');
});

test('markets show large result stamps without probability or xG', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#markets');
  await expect(page.getByRole('img', { name: 'Correct prediction', exact: true })).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Incorrect prediction', exact: true })).toHaveCount(1);
  await expect(page.getByText('Aligned', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Different', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/xG/i)).toHaveCount(0);
  await expect(page.getByText(/\b(12\.0|25\.0|63\.0|66\.0)%\b/)).toHaveCount(0);
  await expect(page.getByText('2-2', { exact: true })).toBeVisible();
  const drawCard = page.locator('.v3-market-card').filter({ hasText: '1X2' });
  await expect(drawCard.getByRole('heading', { name: 'Draw', exact: true })).toBeVisible();
  await expect(drawCard.locator('.v3-market-result small')).toHaveText('Draw');
});

test('no-edge fixture is consumer-labelled DRAW and finished audit is understated', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#matches');
  const derby = page.locator('.v3-match-card').filter({ hasText: 'Man Utd' }); await expect(derby.getByText('DRAW', { exact: true })).toBeVisible(); await expect(derby.getByText('Parity/no-edge → DRAW', { exact: true })).toBeVisible();
  const finished = page.locator('.v3-match-card').filter({ hasText: 'Chelsea' }); await expect(finished.getByText(/1X2 .* · score /)).toBeVisible(); await expect(page.getByText('✓ Correct')).toHaveCount(0); await expect(page.getByText('✕ Miss')).toHaveCount(0);
});

test('player cards open intelligence modals on current Insights and historical History', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#insights');
  const firstPlayer = page.locator('.v3-player-intel-card').first(); const name = (await firstPlayer.locator('.v3-card-player-name').textContent())?.trim() ?? ''; expect(name.length).toBeGreaterThan(0); await firstPlayer.click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').getByRole('heading', { name })).toBeVisible(); await page.getByRole('button', { name: /Close/ }).click();
  await page.getByLabel('Select Gameweek').selectOption('3'); await nav(page, 'history'); await page.locator('.v3-history-player-card').first().click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByText('Frozen historical projection', { exact: true })).toBeVisible();
});

test('matchup modal keeps frozen probabilities and compact result comparison', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#matches'); const chelsea = page.locator('.v3-match-card').filter({ hasText: 'Chelsea' }); await chelsea.getByRole('button', { name: 'Details' }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog.getByText('Frozen probability board', { exact: true })).toBeVisible(); await expect(dialog.getByRole('heading', { name: /Counterpoints \/ risks/ })).toBeVisible(); await expect(dialog.getByText('Transition exposure remains a credible counterpoint.', { exact: true })).toBeVisible();
});

test('all V3 pages keep the global GW control responsive and avoid serious accessibility violations', async ({ page }) => {
  await mockProductApis(page); for (const view of ['home', 'fpl', 'matches', 'markets', 'insights', 'history'] as const) { await page.goto(`/#${view}`); await expect(page.locator('main')).toHaveAttribute('data-active-view', view); await expect(page.getByLabel('Select Gameweek')).toBeVisible(); await assertNoOverflow(page); const results = await new AxeBuilder({ page }).analyze(); const blocking = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious'); expect(blocking, `${view} accessibility`).toEqual([]); }
});
