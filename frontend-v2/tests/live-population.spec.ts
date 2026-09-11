import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
import { analysisEndpoints } from '../src/lib/analysis-api';

const LIVE_TIMEOUT = 30_000;

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Current production population audit runs once per CI matrix.');
}

async function json(request: APIRequestContext, url: string, authenticated = false): Promise<any> {
  const response = await request.get(url, {
    timeout: LIVE_TIMEOUT,
    ...(authenticated ? { headers: publicGatewayHeaders } : {}),
  });
  expect(response.ok(), `${url} should return HTTP 2xx`).toBe(true);
  const payload = await response.json();
  expect(payload?.ok, `${url} should return ok=true`).toBe(true);
  return payload;
}

async function currentGameweek(request: APIRequestContext): Promise<number> {
  const payload = await json(request, endpoints.gameweekStatus, true);
  const gw = Number(payload.live_gameweek);
  expect(Number.isInteger(gw) && gw >= 1 && gw <= 38).toBe(true);
  return gw;
}

async function assertNoPageErrors(page: Page, action: () => Promise<void>): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await action();
  expect(errors).toEqual([]);
}

async function openView(page: Page, view: string, gw: number, heading: string): Promise<void> {
  await page.goto(`/?view=${view}&gw=${gw}`, { waitUntil: 'domcontentloaded', timeout: LIVE_TIMEOUT });
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: LIVE_TIMEOUT });
}

test('current production APIs populate every v2 data surface', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  test.setTimeout(180_000);
  const gw = await currentGameweek(request);
  const suffix = `?gw=${gw}`;

  // Keep the production gate intentionally sequential. Heavy current-state endpoints should
  // not be load-tested by CI simply to prove that their data contracts are populated.
  const fpl = await json(request, `${endpoints.fpl}${suffix}`);
  const manager = await json(request, `${endpoints.managerPlan}${suffix}`, true);
  const intelligence = await json(request, `${endpoints.fixtures}${suffix}`);
  const facts = await json(request, `${endpoints.fixtureFacts}${suffix}`);
  const human = await json(request, `${analysisEndpoints.humanInsights}${suffix}`);
  const betting = await json(request, `${analysisEndpoints.betting}${suffix}`);
  const calibration = await json(request, `${analysisEndpoints.calibration}${suffix}`);
  const engine = await json(request, `${analysisEndpoints.engineDiagnostics}${suffix}`, true);

  expect(fpl.gameweek).toBe(gw);
  expect(fpl.squad).toHaveLength(15);
  expect(fpl.fixture_results).toHaveLength(10);
  expect(fpl.all_predictions.length).toBeGreaterThanOrEqual(500);
  for (const player of fpl.all_predictions) {
    expect(player.expected_points, `${player.name} expected_points`).not.toBeNull();
    expect(player.expected_minutes, `${player.name} expected_minutes`).not.toBeNull();
    expect(player.price, `${player.name} price`).not.toBeNull();
    expect(player.ownership_percent, `${player.name} ownership`).not.toBeNull();
    expect(player.p_10_plus, `${player.name} p10`).not.toBeNull();
    expect(player.q90, `${player.name} q90`).not.toBeNull();
    expect(player.q95, `${player.name} q95`).not.toBeNull();
    expect(String(player.tail_semantics ?? '')).toMatch(/^direct_current_fixture_event_distribution/);
  }

  expect(manager.gameweek).toBe(gw);
  expect(manager.plan).toBeTruthy();
  expect(manager.manager_state).toBeTruthy();
  expect(manager.plan.starting_xi).toHaveLength(11);
  expect(manager.plan.bench_order).toHaveLength(4);
  expect(manager.plan.captain_player_id).toBeTruthy();
  expect(manager.plan.vice_player_id).toBeTruthy();

  expect(intelligence.gameweek).toBe(gw);
  expect(intelligence.fixtures).toHaveLength(10);
  expect(intelligence.fixtures.every((fixture: any) => fixture.high_score_intelligence != null)).toBe(true);
  expect(intelligence.fixtures.every((fixture: any) => fixture.home_team?.tactical_profile != null && fixture.away_team?.tactical_profile != null)).toBe(true);
  expect(intelligence.fixtures.every((fixture: any) => (fixture.home_team?.expected_xi?.length ?? 0) > 0 && (fixture.away_team?.expected_xi?.length ?? 0) > 0)).toBe(true);

  expect(facts.gameweek).toBe(gw);
  expect(facts.facts_available).toBe(true);
  expect(facts.fixtures).toHaveLength(10);
  const factByMatch = new Map(facts.fixtures.map((fixture: any) => [fixture.match_id, fixture]));
  for (const fixture of fpl.fixture_results) {
    const fact: any = factByMatch.get(fixture.match_id);
    expect(fact, `facts for match ${fixture.match_id}`).toBeTruthy();
    expect(fact.alignment_basis?.snapshot_id).toBe(fixture.prediction?.snapshot_id);
  }

  expect(human.gameweek).toBe(gw);
  expect(human.betting_recommendations).toHaveLength(4);

  expect(betting.gameweek).toBe(gw);
  expect(betting.fixtures).toHaveLength(10);
  expect(betting.odds_status).toBe('connected');
  for (const fixture of betting.fixtures) {
    expect(fixture.prediction?.markets, `markets for match ${fixture.match_id}`).toBeTruthy();
    expect(fixture.bookmaker_odds.length, `bookmaker odds for match ${fixture.match_id}`).toBeGreaterThan(0);
  }

  expect(calibration.gameweek).toBe(gw);
  expect(Number.isFinite(Number(calibration.summary?.current_xi_xpts))).toBe(true);
  expect((calibration.validation?.forward?.variants ?? []).length).toBeGreaterThan(0);
  expect((calibration.validation?.retrospective ?? []).length).toBeGreaterThan(0);

  expect(engine.gameweek).toBe(gw);
  expect(engine.active_model?.version).toBeTruthy();
  expect(engine.latest_prediction_run?.id).toBe(fpl.prediction_run_id);
  expect(engine.production_fixture_layer?.fixtures).toBe(10);
  expect(engine.governance?.ok).toBe(true);
  expect(engine.orchestration_readiness?.projection_ready).toBe(true);
  // Decision readiness is a lifecycle state. Before the T−2 final gate, false is valid and
  // must not be confused with absent diagnostics data.
  expect(typeof engine.orchestration_readiness?.decision_ready).toBe('boolean');
  expect((engine.source_health?.zero_cost?.sources ?? []).length).toBeGreaterThan(0);
});

test('every current v2 page renders its populated sections without silent blanks', async ({ page, request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  test.setTimeout(180_000);
  const gw = await currentGameweek(request);

  await assertNoPageErrors(page, async () => {
    await openView(page, 'home', gw, 'Command Center');
    await expect(page.locator('.decision-grid .decision-metric')).toHaveCount(4, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.home-grid .pulse-card')).toHaveCount(3, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.state-panel')).toHaveCount(0);

    await openView(page, 'fpl', gw, 'FPL decision workspace');
    await expect(page.locator('.player-tile-grid .player-tile')).toHaveCount(11, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.bench-list .player-tile')).toHaveCount(4, { timeout: LIVE_TIMEOUT });
    const fullPool = page.locator('.full-pool-details summary');
    await expect(fullPool).toBeVisible({ timeout: LIVE_TIMEOUT });
    await fullPool.click();
    await expect(page.locator('.projection-leader')).toHaveCount(8, { timeout: LIVE_TIMEOUT });
    for (const leader of await page.locator('.projection-leader').all()) {
      const metrics = await leader.locator('.leader-metrics').innerText();
      expect(metrics).not.toContain('—');
    }

    await openView(page, 'fixtures', gw, 'Fixtures');
    await expect(page.locator('.fixture-card')).toHaveCount(10, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.fixture-modal-trigger:disabled')).toHaveCount(0);
    await expect(page.getByText('Prediction unavailable', { exact: true })).toHaveCount(0);

    await openView(page, 'markets', gw, 'Betting');
    await expect(page.locator('.legacy-bet-card')).toHaveCount(4, { timeout: LIVE_TIMEOUT });
    await page.locator('.market-diagnostics-disclosure summary').click();
    await expect(page.locator('.market-card')).toHaveCount(10, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.market-action-chip.is-missing')).toHaveCount(0);

    await openView(page, 'performance', gw, 'Performance');
    await expect(page.getByRole('heading', { name: 'Current FPL snapshot' })).toBeVisible({ timeout: LIVE_TIMEOUT });
    const projectionCard = page.locator('.projection-calibration-card');
    await expect(projectionCard).toContainText('Current XI xPts');
    const currentXiRow = projectionCard.locator('div').filter({ hasText: /^Current XI xPts/ }).first();
    await expect(currentXiRow).not.toContainText('—');
    const matched = await projectionCard.locator('div').filter({ hasText: /^Matched players/ }).first().innerText();
    if (/^Matched players\s+0/.test(matched)) {
      await expect(page.getByText(new RegExp(`External benchmark not captured for GW${gw}`))).toBeVisible({ timeout: LIVE_TIMEOUT });
      await expect(projectionCard).toContainText('Not captured');
      await expect(projectionCard).toContainText('Not available');
    }

    await openView(page, 'engine', gw, 'Engine & Research');
    await expect(page.getByText('Governance clean', { exact: true })).toBeVisible({ timeout: LIVE_TIMEOUT });
    await expect(page.locator('.source-health-card').first()).toBeVisible({ timeout: LIVE_TIMEOUT });
    await expect(page.locator('.analysis-hero-metrics')).not.toContainText('Latest FPL run—');
    await expect(page.locator('.state-panel')).toHaveCount(0);
  });
});
