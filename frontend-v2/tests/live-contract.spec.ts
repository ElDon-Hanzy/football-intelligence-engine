import { expect, test } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
import { analysisEndpoints } from '../src/lib/analysis-api';
import { BettingApiSchema, CalibrationSummarySchema, EngineDiagnosticsSchema } from '../src/lib/analysis-contracts';
import { FixtureFactsApiSchema, FplApiSchema, ManagerPlanApiSchema } from '../src/lib/contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live API contract smoke runs once per CI matrix.');
}

test('historical GW3 FPL API satisfies the chronology-safe UI v2 contract', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.fpl}?gw=3`);
  expect(response.ok()).toBe(true);
  const parsed = FplApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.prediction_run_id).toBeGreaterThan(0);
  expect(parsed.snapshot_stage).toBe('HISTORICAL_FROZEN');
  expect(parsed.historical_projection_valid).toBe(true);
  expect(parsed.squad.length).toBeGreaterThanOrEqual(15);
  expect(parsed.all_predictions.length).toBeGreaterThanOrEqual(500);
  expect(parsed.fixture_results.length).toBe(10);
  expect(parsed.metadata_availability?.historical).toBe(true);
  expect(parsed.metadata_availability?.current_metadata_not_backfilled_into_history).toBe(true);
  for (const player of parsed.squad) {
    expect(player.q90).not.toBeNull();
    expect(player.q95).not.toBeNull();
    expect(player.q95 ?? 0).toBeGreaterThanOrEqual(player.q90 ?? 0);
    expect(player.tail_semantics).toBe('direct_current_fixture_event_distribution');
    if (parsed.metadata_availability?.price_ownership_source === 'UNAVAILABLE_HISTORICALLY') {
      expect(player.price).toBeNull();
      expect(player.ownership_percent).toBeNull();
      expect(player.player_metadata_source).toBe('UNAVAILABLE_HISTORICALLY');
    } else {
      expect(player.price).not.toBeNull();
      expect(player.ownership_percent).not.toBeNull();
    }
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
  expect(fpl.snapshot_stage).toBe('HISTORICAL_FROZEN');
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
  if (!facts.facts_available) return;
  expect(fpl.fixture_results.length).toBe(10);
  expect(facts.fixtures.length).toBe(10);
  for (const fixture of fpl.fixture_results) {
    const fact = facts.fixtures.find((item) => item.match_id === fixture.match_id);
    expect(fact).toBeDefined();
    if (!fact) continue;
    if (fixture.prediction?.snapshot_id != null && fact.alignment_basis?.snapshot_id != null) {
      expect(fact.alignment_basis.snapshot_id).toBe(fixture.prediction.snapshot_id);
      const predictionSource = fixture.prediction.source_change_id;
      if (predictionSource != null && fact.alignment_basis.source_change_id != null) {
        expect(fact.alignment_basis.source_change_id).toBe(predictionSource);
      }
    }
  }
});

test('C0179 returns manager state next to the immutable latest saved GW3 plan', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.managerPlan}?gw=3`, { headers: publicGatewayHeaders });
  expect(response.ok()).toBe(true);
  const parsed = ManagerPlanApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.plan?.gameweek).toBe(3);
  expect(parsed.plan?.id).toBeGreaterThan(0);
  expect(parsed.manager_state?.gameweek).toBe(3);
  expect(parsed.manager_state?.free_transfers).not.toBeNull();
  expect(parsed.manager_state?.bank_tenths).not.toBeNull();
});

test('C0181 betting predictions use the same canonical fixture snapshots and fail closed on value', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${analysisEndpoints.betting}?gw=3`);
  expect(response.ok()).toBe(true);
  const parsed = BettingApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.fixtures.length).toBe(10);
  expect(parsed.value_edge_available).toBe(false);
  for (const fixture of parsed.fixtures) {
    if (!fixture.prediction) continue;
    expect(fixture.prediction.snapshot_id).toBeGreaterThan(0);
  }
});

test('C0174 calibration contract preserves pending validation as missing rather than zero', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(analysisEndpoints.calibration);
  expect(response.ok()).toBe(true);
  const parsed = CalibrationSummarySchema.parse(await response.json());
  expect(parsed.ok).toBe(true);
});

test('C0180 diagnostics contract exposes governance and fail-closed audit state without promoting research layers', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(analysisEndpoints.engineDiagnostics);
  expect(response.ok()).toBe(true);
  const parsed = EngineDiagnosticsSchema.parse(await response.json());
  expect(parsed.ok).toBe(true);
});
