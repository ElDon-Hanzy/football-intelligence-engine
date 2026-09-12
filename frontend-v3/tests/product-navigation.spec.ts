import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

const currentFixtures = [
  { match_id: 1, fpl_fixture_id: 1, kickoff_time: '2026-09-12T14:00:00Z', home_team: 'Chelsea', away_team: 'Hull City', home_short: 'CHE', away_short: 'HUL', finished: true, home_score: 2, away_score: 2, prediction: { snapshot_id: 9001, source_change_id: 'C0166', captured_at: '2026-09-12T12:00:00Z', markets: { home_win: .58, draw: .25, away_win: .17 }, headline_score: '2-1', headline_score_probability: .12, top_scorelines: [{ score: '2-1', prob: .12 }, { score: '1-1', prob: .11 }] } },
  { match_id: 2, fpl_fixture_id: 2, kickoff_time: '2026-09-12T19:00:00Z', home_team: 'Sunderland', away_team: 'Arsenal', home_short: 'SUN', away_short: 'ARS', finished: false, home_score: 0, away_score: 1, prediction: { snapshot_id: 9002, source_change_id: 'C0166', captured_at: '2026-09-12T12:00:00Z', markets: { home_win: .18, draw: .23, away_win: .59 }, headline_score: '1-2', headline_score_probability: .10, top_scorelines: [{ score: '1-2', prob: .10 }] } },
  { match_id: 3, fpl_fixture_id: 3, kickoff_time: '2026-09-13T15:30:00Z', home_team: 'Man Utd', away_team: 'Man City', home_short: 'MUN', away_short: 'MCI', finished: false, home_score: null, away_score: null, prediction: { snapshot_id: 9003, source_change_id: 'C0166', captured_at: '2026-09-12T12:00:00Z', markets: { home_win: .34, draw: .30, away_win: .36 }, headline_score: '1-1', headline_score_probability: .115, top_scorelines: [{ score: '1-1', prob: .115 }] } },
];

const historicalIndex = { ok: true, gameweek: 4, available_gameweeks: [{ gameweek: 1, historical_projection_valid: false }, { gameweek: 2, historical_projection_valid: true }, { gameweek: 3, historical_projection_valid: true }, { gameweek: 4, historical_projection_valid: true }], fixture_results: currentFixtures };
const historicalGw3 = {
  ok: true, gameweek: 3, prediction_run_id: 1274, generated_at: '2026-09-04T17:00:00.604443+00:00', historical_projection_valid: true, snapshot_stage: 'HISTORICAL_FROZEN', metadata_availability: { historical: true, current_metadata_not_backfilled_into_history: true }, available_gameweeks: historicalIndex.available_gameweeks,
  decision: { captain_player_id: 471, vice_player_id: 470, starting_xi: [{ id: 112, name: 'Verbruggen', team: 'Brighton', position: 'GKP', xPts: 4.1, p10: .004, p15: .001, p20: 0 }, { id: 471, name: 'Mbeumo', team: 'Man Utd', position: 'MID', xPts: 6.7, p10: .232, p15: .08, p20: .02 }, { id: 470, name: 'B.Fernandes', team: 'Man Utd', position: 'MID', xPts: 6.6, p10: .225, p15: .07, p20: .02 }], bench: [], recommendations: { formation: '3-5-2' } },
  fixture_results: [{ match_id: 21, kickoff_time: '2026-09-04T19:00:00+00:00', home_team: 'Ipswich Town', away_team: 'Liverpool', finished: true, home_score: 0, away_score: 2, prediction: { markets: { home_win: .2225, draw: .2192, away_win: .5573 }, headline_score: '0-2' } }, { match_id: 22, kickoff_time: '2026-09-05T11:30:00+00:00', home_team: 'Newcastle', away_team: 'Bournemouth', finished: true, home_score: 2, away_score: 2, prediction: { markets: { home_win: .3882, draw: .2278, away_win: .3832 }, headline_score: '1-1' } }],
};
const fixtureFacts = { ok: true, gameweek: 4, facts_available: true, evidence_source: 'test', snapshot_run: { id: 1, as_of_gameweek: 4 }, fixtures: currentFixtures.map((fixture) => ({ match_id: fixture.match_id, gameweek: 4, kickoff_time: fixture.kickoff_time, alignment_basis: { snapshot_id: fixture.prediction.snapshot_id, captured_at: fixture.prediction.captured_at, source_change_id: fixture.prediction.source_change_id }, modal_facts: [{ id: fixture.match_id * 10 + 1, fact_type: 'FORM', usefulness_score: .9, alignment: 'SUPPORTS', one_liner: 'Recent attacking process supports the leading side.' }, { id: fixture.match_id * 10 + 2, fact_type: 'RISK', usefulness_score: .8, alignment: 'CONTRADICTS', one_liner: 'Transition exposure remains a credible counterpoint.' }] })) };
const coreMarkets = { ok: true, gameweek: 4, prediction_run_id: 1365, model_version: '0.3', generated_at: '2026-09-12T12:00:00Z', betting_recommendations: [{ type: 'Correct score', match_id: 1, fixture: 'Chelsea vs Hull City', selection: '2-1', probability: .12, home_lambda: 1.8, away_lambda: 1.1 }, { type: '1X2', match_id: 2, fixture: 'Sunderland vs Arsenal', selection: 'Arsenal win', probability: .59, home_lambda: .9, away_lambda: 1.7 }, { type: 'O/U 2.5', match_id: 2, fixture: 'Sunderland vs Arsenal', selection: 'Over 2.5', probability: .63, home_lambda: .9, away_lambda: 1.7 }, { type: 'BTTS', match_id: 3, fixture: 'Man Utd vs Man City', selection: 'BTTS Yes', probability: .66, home_lambda: 1.5, away_lambda: 1.6 }] };

async function mockProductApis(page: Page) {
  await page.route('**/fpl-v3-workspace-api**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw4WorkspaceFixture) }));
  await page.route('**/fpl-v3-actual-live-api**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw4ActualLiveFixture) }));
  await page.route('**/fixture-facts-api**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureFacts) }));
  await page.route('**/human-insights-api**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coreMarkets) }));
  await page.route('**/fpl-api**', async (route) => { const url = new URL(route.request().url()); const gw = Number(url.searchParams.get('gw') ?? 0); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw === 3 ? historicalGw3 : gw === 4 ? { ...historicalIndex, fixture_results: currentFixtures } : historicalIndex) }); });
}

async function nav(page: Page, view: 'home' | 'fpl' | 'matches' | 'markets' | 'insights' | 'history') { const label = view === 'fpl' ? 'FPL' : `${view.charAt(0).toUpperCase()}${view.slice(1)}`; await page.getByRole('link', { name: label, exact: true }).first().click(); }
async function assertNoOverflow(page: Page) { const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })); expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1); }

test('all six V3 navigation destinations render dense product surfaces', async ({ page }) => {
  await mockProductApis(page); await page.goto('/'); await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
  await nav(page, 'home'); await expect(page.getByRole('heading', { name: 'Command center' })).toBeVisible(); await expect(page.locator('.v3-fixture-row')).toHaveCount(gw4WorkspaceFixture.realized.fixtures.length);
  await nav(page, 'matches'); await expect(page.getByRole('heading', { name: 'Match center' })).toBeVisible(); await expect(page.locator('.v3-match-table tbody tr')).toHaveCount(currentFixtures.length); await expect(page.locator('.v3-match-card')).toHaveCount(0);
  await nav(page, 'markets'); await expect(page.getByRole('heading', { name: 'Four core market predictions' })).toBeVisible(); await expect(page.locator('.v3-markets-table tbody tr')).toHaveCount(4); await expect(page.getByText('O/U 2.5', { exact: true })).toBeVisible(); await expect(page.getByText('BTTS', { exact: true })).toBeVisible();
  await nav(page, 'insights'); await expect(page.getByRole('heading', { name: 'Player intelligence' })).toBeVisible(); await expect(page.locator('.v3-player-data-table tbody tr')).toHaveCount(gw4WorkspaceFixture.recommendation?.squad.length ?? 0);
  await nav(page, 'history'); await expect(page.getByRole('heading', { name: 'History' })).toBeVisible(); await expect(page.getByText('GW3 · HISTORICAL_FROZEN')).toBeVisible();
  await nav(page, 'fpl'); await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
});

test('no-edge fixture is consumer-labelled DRAW and finished audit is understated', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#matches');
  const derby = page.locator('.v3-match-table tbody tr').filter({ hasText: 'Man Utd' }); await expect(derby.getByText('DRAW', { exact: true })).toBeVisible(); await expect(derby.getByText('Parity/no-edge → DRAW', { exact: true })).toBeVisible();
  const finished = page.locator('.v3-match-table tbody tr').filter({ hasText: 'Chelsea' }); await expect(finished.getByText(/1X2 .* · score /)).toBeVisible(); await expect(page.getByText('✓ Correct')).toHaveCount(0); await expect(page.getByText('✕ Miss')).toHaveCount(0);
});

test('player names open intelligence modals outside the FPL pitch', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#insights');
  const firstPlayer = page.locator('.v3-player-data-table .v3-player-link').first(); const name = (await firstPlayer.textContent())?.trim() ?? ''; expect(name.length).toBeGreaterThan(0); await firstPlayer.click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').getByRole('heading', { name })).toBeVisible(); await page.getByRole('button', { name: /Close/ }).click();
  await page.goto('/#history'); await page.locator('.v3-data-table .v3-player-link').first().click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByText('Frozen historical projection', { exact: true })).toBeVisible();
});

test('matchup modal keeps frozen probabilities and compact result comparison', async ({ page }) => {
  await mockProductApis(page); await page.goto('/#matches'); const chelsea = page.locator('.v3-match-table tbody tr').filter({ hasText: 'Chelsea' }); await chelsea.getByRole('button', { name: 'Details' }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog.getByText('Frozen probability board', { exact: true })).toBeVisible(); await expect(dialog.getByRole('heading', { name: /Counterpoints \/ risks/ })).toBeVisible(); await expect(dialog.getByText('Transition exposure remains a credible counterpoint.', { exact: true })).toBeVisible();
});

test('all non-FPL V3 pages stay responsive and avoid serious accessibility violations', async ({ page }) => {
  await mockProductApis(page); for (const view of ['home', 'matches', 'markets', 'insights', 'history'] as const) { await page.goto(`/#${view}`); await expect(page.locator('main')).toHaveAttribute('data-active-view', view); if (view === 'history') await expect(page.getByText('GW3 · HISTORICAL_FROZEN')).toBeVisible(); await assertNoOverflow(page); const results = await new AxeBuilder({ page }).analyze(); const blocking = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious'); expect(blocking, `${view} accessibility`).toEqual([]); }
});
