import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

type View = 'home' | 'fpl' | 'matches' | 'markets' | 'insights' | 'history';
const views: View[] = ['home', 'fpl', 'matches', 'markets', 'insights', 'history'];

function payloadFor(gameweek: number) {
  const matchId = gameweek === 5 ? 41 : 51;
  const fixture = { match_id: matchId, fpl_fixture_id: matchId, kickoff_time: '2026-09-25T18:00:00Z', home_team: `GW${gameweek} Home`, away_team: `GW${gameweek} Away`, home_short: `H${gameweek}`, away_short: `A${gameweek}`, finished: false, home_score: null, away_score: null, prediction: { snapshot_id: matchId, captured_at: '2026-09-24T12:00:00Z', source_change_id: `GW${gameweek}`, markets: { home_win: .5, draw: .25, away_win: .25 }, result_decision: 'HOME', direction_strength: 'LEAN', chronology_and_coverage_valid: true, decision_hash: `gw-${gameweek}`, top_scorelines: [] } };
  const fpl = { ok: true, gameweek, prediction_run_id: gameweek === 5 ? 1458 : 1461, generated_at: '2026-09-24T12:00:00Z', historical_projection_valid: true, snapshot_stage: gameweek === 6 ? 'FORWARD_PRE_DEADLINE' : 'HISTORICAL_FROZEN', decision: { starting_xi: [], bench: [], captain_player_id: null, vice_player_id: null }, all_predictions: [], squad: [], fixture_results: [fixture] };
  const workspace = { ...gw4WorkspaceFixture, gameweek, lifecycle: gameweek === 6 ? 'PRE_DEADLINE' : 'GW_COMPLETE', realized: { ...gw4WorkspaceFixture.realized, fixtures: [{ ...gw4WorkspaceFixture.realized.fixtures[0], match_id: matchId, fpl_fixture_id: matchId, home_team: fixture.home_team, away_team: fixture.away_team }] } };
  const actual = { ...gw4ActualLiveFixture, gameweek };
  const insights = { ok: true, gameweek, prediction_run_id: fpl.prediction_run_id, model_version: 'test', generated_at: fpl.generated_at, top_players: [], fixture_models: [{ match_id: matchId, home: fixture.home_team, away: fixture.away_team, kickoff_time: fixture.kickoff_time, headline_score: null, headline_score_probability: null, markets: {} }], betting_recommendations: [{ type: '1X2', match_id: matchId, fixture: `${fixture.home_team} vs ${fixture.away_team}`, selection: `${fixture.home_team} win`, probability: .5, home_lambda: 1.5, away_lambda: 1 }] };
  return { actual, fpl, insights, workspace };
}

async function mockLineageApis(page: Page, requests: string[]) {
  await page.route('**/gameweek-status-api**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, live_gameweek: 6, latest_intelligence_gameweek: 6 }) }));
  const gameweek = (url: string) => Number(new URL(url).searchParams.get('gw'));
  await page.route('**/fpl-v3-workspace-api**', (route) => { const gw = gameweek(route.request().url()); requests.push(`workspace:${gw}`); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadFor(gw).workspace) }); });
  await page.route('**/fpl-v3-actual-live-api**', (route) => { const gw = gameweek(route.request().url()); requests.push(`actual:${gw}`); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadFor(gw).actual) }); });
  await page.route('**/fpl-api**', (route) => { const gw = gameweek(route.request().url()); requests.push(`fpl:${gw}`); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadFor(gw).fpl) }); });
  await page.route('**/human-insights-api**', (route) => { const gw = gameweek(route.request().url()); requests.push(`insights:${gw}`); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadFor(gw).insights) }); });
  await page.route('**/fixture-facts-api**', (route) => { const gw = gameweek(route.request().url()); requests.push(`facts:${gw}`); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, gameweek: gw, facts_available: false, fixtures: [] }) }); });
}

for (const gameweek of [5, 6]) {
  test(`GW${gameweek} page matrix keeps selected Gameweek lineage across all V3 views`, async ({ page }) => {
    const requests: string[] = []; await mockLineageApis(page, requests);
    for (const view of views) {
      await page.goto(`/?gw=${gameweek}#${view}`);
      await expect(page.locator('main')).toHaveAttribute('data-gameweek', String(gameweek));
      await expect(page.locator(`[data-page="${view}"]`).or(page.locator('.v3-fpl-workspace'))).toBeVisible();
    }
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((request) => request.endsWith(`:${gameweek}`))).toBe(true);
  });
}

test('a GW6-labelled payload that carries GW5 is rejected rather than rendered', async ({ page }) => {
  const requests: string[] = []; await mockLineageApis(page, requests);
  await page.route('**/fpl-api?gw=6', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadFor(5).fpl) }));
  await page.goto('/?gw=6#matches');
  await expect(page.getByText(/Gameweek mismatch: requested GW6, received GW5/)).toBeVisible();
});
