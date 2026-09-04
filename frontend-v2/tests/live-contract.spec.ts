import { expect, test } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
import { analysisEndpoints } from '../src/lib/analysis-api';
import { BettingApiSchema, CalibrationSummarySchema, EngineDiagnosticsSchema } from '../src/lib/analysis-contracts';
import { FixtureFactsApiSchema, FplApiSchema, ManagerPlanApiSchema } from '../src/lib/contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live API contract smoke runs once per CI matrix.');
}

test('live GW3 FPL API satisfies the UI v2 contract', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.fpl}?gw=3`);
  expect(response.ok()).toBe(true);
  const parsed = FplApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.prediction_run_id).toBeGreaterThan(0);
  expect(parsed.squad.length).toBeGreaterThanOrEqual(15);
  expect(parsed.all_predictions.length).toBeGreaterThanOrEqual(500);
  expect(parsed.fixture_results.length).toBe(10);
  for (const player of parsed.squad) {
    expect(player.q90).not.toBeNull();
    expect(player.q95).not.toBeNull();
    expect(player.q95 ?? 0).toBeGreaterThanOrEqual(player.q90 ?? 0);
    expect(player.tail_semantics).toBe('direct_current_fixture_event_distribution');
    expect(player.price).not.toBeNull();
    expect(player.ownership_percent).not.toBeNull();
  }
});

test('C0194 live GW2 exposes the frozen FPL decision and separate actual manager correction', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const [fplResponse, managerResponse] = await Promise.all([
    request.get(`${endpoints.fpl}?gw=2`),
    request.get(`${endpoints.managerPlan}?gw=2`, { headers: publicGatewayHeaders }),
  ]);
  expect(fplResponse.ok()).toBe(true);
  expect(managerResponse.ok()).toBe(true);
  const fpl = FplApiSchema.parse(await fplResponse.json());
  const manager = ManagerPlanApiSchema.parse(await managerResponse.json());
  expect(fpl.gameweek).toBe(2);
  expect(fpl.decision).not.toBeNull();
  expect(fpl.decision?.starting_xi?.length ?? 0).toBe(11);
  expect(fpl.decision?.bench?.length ?? 0).toBe(4);
  expect(fpl.decision?.captain_player_id).not.toBeNull();
  expect(manager.gameweek).toBe(2);
  expect(manager.plan).toBeNull();
  expect(manager.actual_manager_decision?.captain_player_id).toBe(470);
  expect(manager.actual_manager_decision?.source).toBe('manager_confirmed');
  expect(manager.actual_manager_decision?.vice_player_id ?? null).toBeNull();
  expect(manager.actual_manager_decision?.starting_xi ?? null).toBeNull();
});

test('C0178 keeps prediction and evidence contracts on the same canonical fixture snapshot', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const [fplResponse, factsResponse] = await Promise.all([
    request.get(`${endpoints.fpl}?gw=3`),
    request.get(`${endpoints.fixtureFacts}?gw=3`),
  ]);
  expect(fplResponse.ok()).toBe(true);
  expect(factsResponse.ok()).toBe(true);
  const fpl = FplApiSchema.parse(await fplResponse.json());
  const facts = FixtureFactsApiSchema.parse(await factsResponse.json());
  expect(facts.facts_available).toBe(true);
  if (!facts.facts_available) throw new Error('GW3 fact snapshot unexpectedly unavailable');
  expect(facts.fixtures).toHaveLength(10);
  const fplByMatch = new Map(fpl.fixture_results.map((fixture) => [fixture.match_id, fixture]));
  for (const factFixture of facts.fixtures) {
    const prediction = fplByMatch.get(factFixture.match_id)?.prediction;
    const basis = factFixture.alignment_basis;
    expect(prediction?.snapshot_id).toBe(basis?.snapshot_id);
    expect(prediction?.source_change_id).toBe(basis?.source_change_id);
    expect(prediction?.markets?.home_win).toBeCloseTo(basis?.markets.home_win ?? -1, 8);
    expect(prediction?.markets?.draw).toBeCloseTo(basis?.markets.draw ?? -1, 8);
    expect(prediction?.markets?.away_win).toBeCloseTo(basis?.markets.away_win ?? -1, 8);
  }
  const fulhamPalace = fplByMatch.get(25)?.prediction;
  expect(fulhamPalace?.source_change_id).toBe('C0166');
  expect(fulhamPalace?.markets?.home_win).toBeGreaterThan(fulhamPalace?.markets?.away_win ?? 1);
  expect((fulhamPalace?.markets?.home_win ?? 0) - (fulhamPalace?.markets?.away_win ?? 0)).toBeLessThan(0.04);
});

test('C0179 returns manager state next to the immutable latest saved GW3 plan', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.managerPlan}?gw=3`, { headers: publicGatewayHeaders });
  expect(response.ok()).toBe(true);
  const parsed = ManagerPlanApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.plan).not.toBeNull();
  expect(parsed.plan?.id ?? 0).toBeGreaterThanOrEqual(3);
  expect(parsed.plan?.gameweek).toBe(3);
  expect(parsed.plan?.status?.length ?? 0).toBeGreaterThan(0);
  expect(parsed.plan?.source?.length ?? 0).toBeGreaterThan(0);
  expect(Array.isArray(parsed.plan?.transfers)).toBe(true);
  expect(parsed.manager_state?.free_transfers).toBe(2);
  expect(parsed.manager_state?.bank_tenths).toBe(0);
  expect(parsed.manager_state?.acquisition_squad_cost_tenths).toBe(1000);
  expect(parsed.manager_state?.source).toBe('C0179_DERIVED_AUDITED_MANAGER_STATE_V1');
});

test('C0181 betting predictions use the same canonical fixture snapshots and fail closed on value', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const [marketResponse, fplResponse] = await Promise.all([
    request.get(`${analysisEndpoints.betting}?gw=3`),
    request.get(`${endpoints.fpl}?gw=3`),
  ]);
  expect(marketResponse.ok()).toBe(true);
  expect(fplResponse.ok()).toBe(true);
  const parsed = BettingApiSchema.parse(await marketResponse.json());
  const fpl = FplApiSchema.parse(await fplResponse.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.fixtures).toHaveLength(10);
  expect(parsed.value_edge_available).toBe(false);
  const fplByMatch = new Map(fpl.fixture_results.map((fixture) => [fixture.match_id, fixture]));
  for (const fixture of parsed.fixtures) {
    const canonical = fplByMatch.get(fixture.match_id)?.prediction;
    expect(fixture.prediction?.snapshot_id).toBe(canonical?.snapshot_id);
    expect(fixture.prediction?.source_change_id).toBe(canonical?.source_change_id);
    expect(fixture.prediction?.markets?.home_win).toBeCloseTo(canonical?.markets?.home_win ?? -1, 8);
    expect(fixture.prediction?.markets?.draw).toBeCloseTo(canonical?.markets?.draw ?? -1, 8);
    expect(fixture.prediction?.markets?.away_win).toBeCloseTo(canonical?.markets?.away_win ?? -1, 8);
    if (fixture.edge_research) expect(fixture.edge_research.model_effect_enabled).toBe(false);
    if (fixture.clv_research) expect(fixture.clv_research.model_effect_enabled).toBe(false);
  }
});

test('C0174 calibration contract preserves pending validation as missing rather than zero', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${analysisEndpoints.calibration}?gw=3`);
  expect(response.ok()).toBe(true);
  const parsed = CalibrationSummarySchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.active_model.length).toBeGreaterThan(0);
  expect(parsed.validation.forward.available).toBe(true);
  const testVariants = parsed.validation.forward.variants?.filter((row) => row.split === 'TEST') ?? [];
  for (const row of testVariants) {
    if ((row.evaluated_fixtures ?? 0) === 0) {
      expect(row.avg_brier ?? null).toBeNull();
      expect(row.direction_accuracy ?? null).toBeNull();
    }
  }
});

test('C0180 diagnostics contract exposes clean governance without promoting research layers', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${analysisEndpoints.engineDiagnostics}?gw=3`, { headers: publicGatewayHeaders });
  expect(response.ok()).toBe(true);
  const parsed = EngineDiagnosticsSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.governance.ok).toBe(true);
  expect(parsed.governance.bad_change_ids).toBe(0);
  expect(parsed.decision_evidence_audit.ok).toBe(true);
  expect(parsed.production_evidence_audit.ok).toBe(true);
  expect(parsed.production_fixture_layer.fixtures).toBe(10);
  expect(parsed.production_fixture_layer.change_ids).toContain('C0166');
  expect(parsed.semantics.research_statuses_are_not_production_effects).toBe(true);
  expect(parsed.semantics.missing_is_not_zero).toBe(true);
  expect(parsed.source_health.zero_cost.integrity_violations?.model_effect_enabled ?? 0).toBe(0);
  expect(parsed.source_health.fotmob_metrics.integrity_violations?.model_effect_enabled ?? 0).toBe(0);
  expect(parsed.source_health.physical_load.integrity_violations?.model_effect_enabled ?? 0).toBe(0);
});
