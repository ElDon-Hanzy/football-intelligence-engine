import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
import { analysisEndpoints } from '../src/lib/analysis-api';

const LIVE_TIMEOUT = 30_000;
const LIVE_ATTEMPTS = 3;

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Current production population audit runs once per CI matrix.');
}

async function json(request: APIRequestContext, url: string, authenticated = false): Promise<any> {
  let lastStatus = 0;
  let lastError = '';
  for (let attempt = 1; attempt <= LIVE_ATTEMPTS; attempt += 1) {
    try {
      const response = await request.get(url, {
        timeout: LIVE_TIMEOUT,
        ...(authenticated ? { headers: publicGatewayHeaders } : {}),
      });
      lastStatus = response.status();
      if (response.ok()) {
        const payload = await response.json();
        if (payload?.ok === true) return payload;
        lastError = `ok flag was ${String(payload?.ok)}`;
      } else {
        lastError = `HTTP ${response.status()}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < LIVE_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
  }
  expect(false, `${url} should return HTTP 2xx and ok=true within ${LIVE_ATTEMPTS} attempts; last status ${lastStatus}; ${lastError}`).toBe(true);
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

async function openView(page: Page, view: string, gw: number, heading: string | RegExp): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= LIVE_ATTEMPTS; attempt += 1) {
    await page.goto(`/?view=${view}&gw=${gw}`, { waitUntil: 'domcontentloaded', timeout: LIVE_TIMEOUT });
    try {
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: LIVE_TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < LIVE_ATTEMPTS) await page.waitForTimeout(1_500 * attempt);
    }
  }
  throw lastError;
}

function expectGovernanceContract(governance: any): void {
  expect(typeof governance?.ok).toBe('boolean');
  for (const field of ['total_rows', 'decision_rows', 'bad_change_ids', 'completed_not_verified', 'completed_without_refs', 'decision_rows_without_refs']) {
    expect(Number.isInteger(governance?.[field]), `governance.${field}`).toBe(true);
    expect(governance[field], `governance.${field}`).toBeGreaterThanOrEqual(0);
  }
}

test('current production APIs populate every v2 data surface', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  test.setTimeout(360_000);
  const gw = await currentGameweek(request);
  const suffix = `?gw=${gw}`;

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
  const historicalMetadataUnavailable = fpl.snapshot_stage === 'HISTORICAL_FROZEN'
    && fpl.metadata_availability?.price_ownership_source === 'UNAVAILABLE_HISTORICALLY';
  for (const player of fpl.all_predictions) {
    expect(player.expected_points, `${player.name} expected_points`).not.toBeNull();
    expect(player.expected_minutes, `${player.name} expected_minutes`).not.toBeNull();
    if (!historicalMetadataUnavailable) {
      expect(player.price, `${player.name} price`).not.toBeNull();
      expect(player.ownership_percent, `${player.name} ownership`).not.toBeNull();
    } else {
      expect(player.player_metadata_source, `${player.name} historical metadata source`).toBe('UNAVAILABLE_HISTORICALLY');
    }
    expect(player.p_10_plus, `${player.name} p10`).not.toBeNull();
    expect(player.q90, `${player.name} q90`).not.toBeNull();
    expect(player.q95, `${player.name} q95`).not.toBeNull();
    expect(String(player.tail_semantics ?? '')).toMatch(/^direct_current_fixture_event_distribution/);
  }

  expect(manager.gameweek).toBe(gw);
  if (fpl.snapshot_stage === 'HISTORICAL_FROZEN') {
    expect(fpl.decision).toBeTruthy();
  } else if (manager.plan == null) {
    expect(manager.saved_plan).toBeNull();
    expect(manager.live_plan).toBeNull();
    expect(manager.manager_state).toBeNull();
    expect(manager.semantics?.missing_manager_state_is_not_zero).toBe(true);
  } else {
    expect(manager.manager_state).toBeTruthy();
    expect(manager.plan.starting_xi).toHaveLength(11);
    expect(manager.plan.bench_order).toHaveLength(4);
    expect(manager.plan.captain_player_id).toBeTruthy();
    expect(manager.plan.vice_player_id).toBeTruthy();
  }

  expect(intelligence.gameweek).toBe(gw);
  expect(intelligence.fixtures).toHaveLength(10);
  expect(intelligence.fixtures.every((fixture: any) => fixture.high_score_intelligence != null)).toBe(true);
  expect(intelligence.fixtures.every((fixture: any) => fixture.home_team?.tactical_profile != null && fixture.away_team?.tactical_profile != null)).toBe(true);
  const deadlinePassed = fpl.deadline_at != null && Number.isFinite(new Date(fpl.deadline_at).getTime())
    ? Date.now() >= new Date(fpl.deadline_at).getTime()
    : false;
  if (!deadlinePassed && manager.plan != null) {
    for (const fixture of intelligence.fixtures) {
      expect(fixture.home_team?.expected_xi?.length ?? 0, `home expected XI for match ${fixture.match_id}`).toBeGreaterThan(0);
      expect(fixture.away_team?.expected_xi?.length ?? 0, `away expected XI for match ${fixture.match_id}`).toBeGreaterThan(0);
    }
  }

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
  expect(human.fixture_models).toHaveLength(10);

  expect(betting.gameweek).toBe(gw);
  expect(betting.fixtures).toHaveLength(10);
  expect(betting.odds_status).toBe('connected');
  const fplByMatch = new Map(fpl.fixture_results.map((fixture: any) => [Number(fixture.match_id), fixture]));
  const humanByMatch = new Map((human.fixture_models ?? []).map((fixture: any) => [Number(fixture.match_id), fixture]));
  for (const fixture of betting.fixtures) {
    expect(fixture.prediction?.markets, `markets for match ${fixture.match_id}`).toBeTruthy();
    expect(fixture.bookmaker_odds.length, `bookmaker odds for match ${fixture.match_id}`).toBeGreaterThan(0);
    const canonical: any = fplByMatch.get(Number(fixture.match_id));
    expect(canonical, `canonical FPL fixture ${fixture.match_id}`).toBeTruthy();
    expect(fixture.prediction?.snapshot_id, `betting snapshot ${fixture.match_id}`).toBe(canonical.prediction?.snapshot_id);
    expect(fixture.prediction?.headline_score, `betting headline ${fixture.match_id}`).toBe(canonical.prediction?.headline_score);
    const humanFixture: any = humanByMatch.get(Number(fixture.match_id));
    expect(humanFixture, `human-insights fixture ${fixture.match_id}`).toBeTruthy();
    expect(humanFixture.snapshot_id, `human-insights snapshot ${fixture.match_id}`).toBe(canonical.prediction?.snapshot_id);
    expect(humanFixture.headline_score, `human-insights headline ${fixture.match_id}`).toBe(canonical.prediction?.headline_score);
  }
  const correctScore = human.betting_recommendations.find((call: any) => call.type === 'Correct score');
  expect(correctScore).toBeTruthy();
  const exactCanonical: any = fplByMatch.get(Number(correctScore.match_id));
  expect(correctScore.selection).toBe(exactCanonical?.prediction?.headline_score);
  expect(correctScore.snapshot_id).toBe(exactCanonical?.prediction?.snapshot_id);

  expect(calibration.gameweek).toBe(gw);
  expect(Number.isFinite(Number(calibration.summary?.current_xi_xpts))).toBe(true);
  expect((calibration.validation?.forward?.variants ?? []).length).toBeGreaterThan(0);
  expect((calibration.validation?.retrospective ?? []).length).toBeGreaterThan(0);

  expect(engine.gameweek).toBe(gw);
  expect(engine.active_model?.version).toBeTruthy();
  expect(engine.latest_prediction_run?.id).toBe(fpl.prediction_run_id);
  expect(engine.production_fixture_layer?.fixtures).toBe(10);
  // Governance truth is carried by the typed diagnostics contract. Do not infer lifecycle
  // state from guessed status words: ok=false plus the counters is itself an explicit state.
  expectGovernanceContract(engine.governance);
  expect(typeof engine.orchestration_readiness?.projection_ready).toBe('boolean');
  if (!deadlinePassed && engine.orchestration_readiness?.projection_ready === false) {
    // C0284 intentionally remains fail-closed until P7 binds fixture, player and
    // FPL lineage. A blocked readiness contract is valid only with explicit reasons.
    expect(engine.orchestration_readiness?.blockers?.length ?? 0).toBeGreaterThan(0);
  }
  expect(typeof engine.orchestration_readiness?.decision_ready).toBe('boolean');
  expect((engine.source_health?.zero_cost?.sources ?? []).length).toBeGreaterThan(0);
});

test('every current v2 page renders its populated sections without silent blanks', async ({ page, request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  test.setTimeout(360_000);
  const gw = await currentGameweek(request);
  const manager = await json(request, `${endpoints.managerPlan}?gw=${gw}`, true);

  await assertNoPageErrors(page, async () => {
    await openView(page, 'home', gw, 'Command Center');
    await expect(page.locator('.decision-grid .decision-metric')).toHaveCount(4, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.home-grid .pulse-card')).toHaveCount(3, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.state-panel')).toHaveCount(0);

    await page.goto(`/?view=fpl&gw=${gw}`, { waitUntil: 'domcontentloaded', timeout: LIVE_TIMEOUT });
    const fplWorkspaceHeading = page.getByRole('heading', { level: 1, name: /^(FPL decision workspace|FPL decision history)$/ });
    const fplUnavailableHeading = page.getByRole('heading', { level: 1, name: 'FPL decision data is unavailable.' });
    await expect(fplWorkspaceHeading.or(fplUnavailableHeading)).toBeVisible({ timeout: LIVE_TIMEOUT });
    const fplWorkspaceVisible = await fplWorkspaceHeading.isVisible();
    if (manager.plan == null) {
      await expect(page.getByText('No authoritative manager plan is saved for this Gameweek.', { exact: true }).or(page.getByText('The workspace will not reconstruct a manager decision from projection rankings when the authoritative contracts fail.', { exact: true }))).toBeVisible({ timeout: LIVE_TIMEOUT });
      await expect(page.locator('.player-tile-grid .player-tile')).toHaveCount(0, { timeout: LIVE_TIMEOUT });
      await expect(page.locator('.bench-list .player-tile')).toHaveCount(0, { timeout: LIVE_TIMEOUT });
    } else {
      await expect(fplWorkspaceHeading).toBeVisible({ timeout: LIVE_TIMEOUT });
      await expect(page.locator('.player-tile-grid .player-tile')).toHaveCount(11, { timeout: LIVE_TIMEOUT });
      await expect(page.locator('.bench-list .player-tile')).toHaveCount(4, { timeout: LIVE_TIMEOUT });
    }
    if (fplWorkspaceVisible) {
      const fullPool = page.locator('.full-pool-details summary');
      await expect(fullPool).toBeVisible({ timeout: LIVE_TIMEOUT });
      await fullPool.click();
      await expect(page.locator('.projection-leader')).toHaveCount(8, { timeout: LIVE_TIMEOUT });
      for (const leader of await page.locator('.projection-leader').all()) {
        const metrics = await leader.locator('.leader-metrics').innerText();
        expect(metrics).not.toContain('—');
      }
    }

    await openView(page, 'fixtures', gw, 'Fixtures');
    await expect(page.locator('.fixture-card')).toHaveCount(10, { timeout: LIVE_TIMEOUT });
    await expect(page.locator('.fixture-modal-trigger:disabled')).toHaveCount(0, { timeout: LIVE_TIMEOUT });
    await expect(page.getByText('Prediction unavailable', { exact: true })).toHaveCount(0);

    await openView(page, 'markets', gw, 'Betting');
    await expect(page.locator('.legacy-bet-card')).toHaveCount(4, { timeout: LIVE_TIMEOUT });
    await page.locator('.market-diagnostics-disclosure > summary').click();
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
    // Assert the actual Engine diagnostics UI contract: governance has a named section and
    // renders either ledger state, while decision readiness carries fail-closed lifecycle truth.
    await expect(page.getByRole('heading', { name: /^(Clean ledger|Attention required)$/ })).toBeVisible({ timeout: LIVE_TIMEOUT });
    await expect(page.getByRole('heading', { name: /^Decision (READY|BLOCKED|UNKNOWN)$/ })).toBeVisible({ timeout: LIVE_TIMEOUT });
    await expect(page.getByRole('heading', { name: 'Fail-closed rules active' })).toBeVisible({ timeout: LIVE_TIMEOUT });
    await expect(page.locator('.source-health-card').first()).toBeVisible({ timeout: LIVE_TIMEOUT });
    await expect(page.locator('.analysis-hero-metrics')).not.toContainText('Latest FPL run—');
    await expect(page.locator('.state-panel')).toHaveCount(0);
  });
});
