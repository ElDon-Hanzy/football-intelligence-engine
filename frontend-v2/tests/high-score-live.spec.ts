import { expect, test } from '@playwright/test';
import { endpoints } from '../src/lib/api';
import { FixtureIntelligenceApiSchema } from '../src/lib/fixture-intelligence-contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live C0197 contract smoke runs once per CI matrix.');
}

test('C0200 live fixture intelligence exposes frozen C0197 predictions without production effect', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.fixtures}?gw=3`);
  expect(response.ok()).toBe(true);
  const parsed = FixtureIntelligenceApiSchema.parse(await response.json());

  expect(parsed.gameweek).toBe(3);
  expect(parsed.contract_version).toBe('fixture_intelligence_v0.3');
  expect(parsed.research_only).toBe(true);
  expect(parsed.model_effect_enabled).toBe(false);
  expect(parsed.fixtures).toHaveLength(10);

  for (const fixture of parsed.fixtures) {
    const highScore = fixture.high_score_intelligence;
    expect(highScore.research_only).toBe(true);
    expect(highScore.model_effect_enabled).toBe(false);
    expect(highScore.available).toBe(true);
    if (highScore.available) {
      expect(highScore.source_change_id).toBe('C0197');
      expect(highScore.prediction_semantics).toBe('research_high_score_archetype_not_probability');
      expect(highScore.router.structural.rank).not.toBeNull();
      expect(highScore.router.disruption.rank).not.toBeNull();
    }
  }

  const byMatch = new Map(parsed.fixtures.map((fixture) => [fixture.match_id, fixture.high_score_intelligence]));
  const evertonUnited = byMatch.get(29);
  expect(evertonUnited?.available).toBe(true);
  if (evertonUnited?.available) {
    expect(evertonUnited.archetype).toBe('SHOOTOUT');
    expect(evertonUnited.strength).toBe('VERY_HIGH');
    expect(evertonUnited.agreement).toBe('HIGH');
    expect(evertonUnited.router.structural.rank).toBe(2);
    expect(evertonUnited.router.disruption.rank).toBe(1);
  }

  const cityCoventry = byMatch.get(26);
  expect(cityCoventry?.available).toBe(true);
  if (cityCoventry?.available) {
    expect(cityCoventry.archetype).toBe('DEMOLITION');
    expect(cityCoventry.strength).toBe('VERY_HIGH');
    expect(cityCoventry.router.structural.favorite).toBe('Man City');
    expect(cityCoventry.router.structural.rank).toBe(1);
    expect(cityCoventry.router.disruption.rank).toBe(2);
  }

  const fulhamPalace = byMatch.get(25);
  expect(fulhamPalace?.available).toBe(true);
  if (fulhamPalace?.available) {
    expect(fulhamPalace.archetype).toBe('NO_STRONG_SIGNAL');
    expect(fulhamPalace.strength).toBe('LOW');
  }
});
