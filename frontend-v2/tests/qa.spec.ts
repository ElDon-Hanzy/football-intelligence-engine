import { expect, test } from '@playwright/test';
import { endpoints } from '../src/lib/api';
import { analysisEndpoints } from '../src/lib/analysis-api';
import { BettingApiSchema } from '../src/lib/analysis-contracts';
import { FplApiSchema } from '../src/lib/contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live current/historical parity runs once per CI matrix.');
}

test('malformed FPL contracts fail closed without an unhandled browser error', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/fpl-api**', async (route) => route.fulfill({ json: { ok: true, gameweek: 3, squad: 'not-an-array' } }));
  await page.route('**/fpl-manager-plan-api**', async (route) => route.fulfill({ json: { ok: true, gameweek: 3, available_gameweeks: [], plan: { invalid: true } } }));
  await page.goto('/?view=fpl&gw=3');
  await expect(page.getByRole('heading', { name: 'FPL decision data is unavailable.' })).toBeVisible();
  await expect(page.getByText('will not reconstruct a manager decision', { exact: false })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('core navigation produces no unhandled page errors with deterministic API failures', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/fpl-api**', async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));
  await page.route('**/fpl-manager-plan-api**', async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));
  await page.route('**/fixture-facts-api**', async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));
  await page.route('**/betting-api**', async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));
  await page.route('**/calibration-summary**', async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));
  await page.route('**/engine-diagnostics-api**', async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));

  for (const view of ['fpl', 'fixtures', 'markets', 'performance', 'engine']) {
    await page.goto(`/?view=${view}&gw=3`);
    await expect(page.locator('body')).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('current and historical shared prediction contracts stay canonically aligned', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  for (const gw of [2, 3]) {
    const [fplResponse, bettingResponse] = await Promise.all([
      request.get(`${endpoints.fpl}?gw=${gw}`),
      request.get(`${analysisEndpoints.betting}?gw=${gw}`),
    ]);
    expect(fplResponse.ok()).toBe(true);
    expect(bettingResponse.ok()).toBe(true);
    const fpl = FplApiSchema.parse(await fplResponse.json());
    const betting = BettingApiSchema.parse(await bettingResponse.json());
    const fplByMatch = new Map(fpl.fixture_results.map((fixture) => [fixture.match_id, fixture]));
    expect(betting.fixtures.length).toBe(fpl.fixture_results.length);
    for (const marketFixture of betting.fixtures) {
      const fplPrediction = fplByMatch.get(marketFixture.match_id)?.prediction;
      expect(marketFixture.prediction?.snapshot_id).toBe(fplPrediction?.snapshot_id);
      expect(marketFixture.prediction?.source_change_id).toBe(fplPrediction?.source_change_id);
      expect(marketFixture.prediction?.markets?.home_win).toBeCloseTo(fplPrediction?.markets?.home_win ?? -1, 8);
      expect(marketFixture.prediction?.markets?.draw).toBeCloseTo(fplPrediction?.markets?.draw ?? -1, 8);
      expect(marketFixture.prediction?.markets?.away_win).toBeCloseTo(fplPrediction?.markets?.away_win ?? -1, 8);
    }
    if (gw === 2) {
      expect(fpl.fixture_results).toHaveLength(10);
      expect(fpl.fixture_results.every((fixture) => fixture.finished)).toBe(true);
      expect(fpl.fixture_results.every((fixture) => fixture.home_score != null && fixture.away_score != null)).toBe(true);
    }
  }
});
