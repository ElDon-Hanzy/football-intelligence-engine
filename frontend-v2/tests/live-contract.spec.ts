import { expect, test } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
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
  expect(parsed.squad.length).toBeGreaterThanOrEqual(15);
  expect(parsed.fixture_results.length).toBe(10);
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

test('C0177 returns the immutable latest saved GW3 manager plan', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.managerPlan}?gw=3`, { headers: publicGatewayHeaders });
  expect(response.ok()).toBe(true);
  const parsed = ManagerPlanApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.plan?.id).toBe(3);
  expect(parsed.plan?.captain_player_id).toBe(470);
  expect(parsed.plan?.transfers).toEqual([]);
});
