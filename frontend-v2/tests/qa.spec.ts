import { expect, test, type Page } from '@playwright/test';
import { endpoints } from '../src/lib/api';
import { analysisEndpoints } from '../src/lib/analysis-api';
import { BettingApiSchema } from '../src/lib/analysis-contracts';
import { FplApiSchema } from '../src/lib/contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live current/historical parity runs once per CI matrix.');
}

const outagePatterns = [
  '**/gameweek-status-api**',
  '**/fpl-api**',
  '**/fpl-manager-plan-api**',
  '**/fixture-facts-api**',
  '**/human-insights-api**',
  '**/betting-api**',
  '**/calibration-summary**',
  '**/engine-diagnostics-api**',
] as const;

async function routeAllApisTo503(page: Page): Promise<void> {
  for (const pattern of outagePatterns) {
    await page.route(pattern, async (route) => route.fulfill({ status: 503, json: { ok: false, error: 'qa outage' } }));
  }
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
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
  await routeAllApisTo503(page);

  for (const view of ['fpl', 'fixtures', 'markets', 'performance', 'engine']) {
    await page.goto(`/?view=${view}&gw=3`);
    await expect(page.locator('body')).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('every shell navigation path and browser history transition resolves to the intended route', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await routeAllApisTo503(page);
  await page.goto('/?view=home&gw=3');

  const visibleNavigation = page.locator('nav:visible');
  const primaryViews = [
    ['Fixtures', 'fixtures'],
    ['FPL', 'fpl'],
    ['Markets', 'markets'],
    ['Performance', 'performance'],
    ['Home', 'home'],
  ] as const;

  for (const [label, view] of primaryViews) {
    const control = visibleNavigation.getByRole('button', { name: label, exact: true });
    await control.click();
    await expect(page).toHaveURL(new RegExp(`view=${view}.*gw=3|gw=3.*view=${view}`));
    await expect(control).toHaveAttribute('aria-current', 'page');
  }

  const width = page.viewportSize()?.width ?? 0;
  if (width > 920) {
    const engine = visibleNavigation.getByRole('button', { name: 'Engine', exact: true });
    await engine.click();
    await expect(page).toHaveURL(/view=engine/);
    await expect(engine).toHaveAttribute('aria-current', 'page');
  } else {
    const engine = page.getByRole('button', { name: 'Engine and research' });
    await engine.click();
    await expect(page).toHaveURL(/view=engine/);
    await expect(engine).toHaveClass(/is-active/);
  }

  await visibleNavigation.getByRole('button', { name: 'Fixtures', exact: true }).click();
  await visibleNavigation.getByRole('button', { name: 'FPL', exact: true }).click();
  await expect(page).toHaveURL(/view=fpl/);
  await page.goBack();
  await expect(page).toHaveURL(/view=fixtures/);
  await page.goForward();
  await expect(page).toHaveURL(/view=fpl/);

  expect(pageErrors).toEqual([]);
});

const loadingCases = [
  { view: 'home', patterns: ['**/fpl-api**', '**/fpl-manager-plan-api**'], label: 'Loading command center', errorHeading: 'Live decision data is temporarily unavailable.' },
  { view: 'fixtures', patterns: ['**/fpl-api**'], label: 'Loading fixtures', errorHeading: 'Fixture predictions are temporarily unavailable.' },
  { view: 'fpl', patterns: ['**/fpl-api**', '**/fpl-manager-plan-api**'], label: 'Loading FPL decision workspace', errorHeading: 'FPL decision data is unavailable.' },
  { view: 'markets', patterns: ['**/human-insights-api**'], label: 'Loading Betting', errorHeading: 'Model calls are unavailable.' },
  { view: 'performance', patterns: ['**/calibration-summary**'], label: 'Loading Performance', errorHeading: 'Validation data is unavailable.' },
  { view: 'engine', patterns: ['**/engine-diagnostics-api**'], label: 'Loading Engine diagnostics', errorHeading: 'Diagnostics are unavailable.' },
] as const;

for (const loadingCase of loadingCases) {
  test(`${loadingCase.view} exposes a deterministic loading state before failing closed`, async ({ page }) => {
    const releases: Array<() => void> = [];
    for (const pattern of loadingCase.patterns) {
      let holdFirstRequest = true;
      await page.route(pattern, async (route) => {
        if (holdFirstRequest) {
          holdFirstRequest = false;
          await new Promise<void>((resolve) => releases.push(resolve));
        }
        await route.fulfill({ status: 503, json: { ok: false, error: 'qa released outage' } });
      });
    }

    await page.goto(`/?view=${loadingCase.view}&gw=3`);
    const loading = page.getByLabel(loadingCase.label, { exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect.poll(() => releases.length).toBe(loadingCase.patterns.length);
    for (const release of releases) release();
    await expect(page.getByRole('heading', { name: loadingCase.errorHeading })).toBeVisible();
  });
}

test('shell preserves touch targets, safe-area rules and overflow resilience on every route', async ({ page }) => {
  await routeAllApisTo503(page);
  const views = ['home', 'fixtures', 'fpl', 'markets', 'performance', 'engine'] as const;
  const width = page.viewportSize()?.width ?? 0;

  for (const view of views) {
    await page.goto(`/?view=${view}&gw=3`);
    await assertNoHorizontalOverflow(page);

    const visibleNavigation = page.locator('nav:visible');
    for (const control of await visibleNavigation.locator('button').all()) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const gameweek = page.getByLabel('Gameweek');
    const gwBox = await gameweek.boundingBox();
    expect(gwBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    if (width <= 920) {
      const engine = page.getByRole('button', { name: 'Engine and research' });
      const engineBox = await engine.boundingBox();
      expect(engineBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }

  const safeAreaCss = await page.evaluate(() => Array.from(document.styleSheets).flatMap((sheet) => {
    try { return Array.from(sheet.cssRules).map((rule) => rule.cssText); }
    catch { return []; }
  }).join('\n'));
  expect(safeAreaCss).toContain('safe-area-inset-top');
  expect(safeAreaCss).toContain('safe-area-inset-right');
  expect(safeAreaCss).toContain('safe-area-inset-bottom');
  expect(safeAreaCss).toContain('safe-area-inset-left');

  if (width <= 920) {
    const mobileNav = page.locator('.mobile-nav-wrap');
    await expect(mobileNav).toBeVisible();
    const navBox = await mobileNav.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 0;
    expect((navBox?.y ?? 0) + (navBox?.height ?? 0)).toBeLessThanOrEqual(viewportHeight + 1);
    const contentPaddingBottom = await page.locator('.app-content').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBottom));
    expect(contentPaddingBottom).toBeGreaterThanOrEqual(navBox?.height ?? 0);
  } else {
    const legacy = page.getByRole('link', { name: 'Legacy UI' });
    await expect(legacy).toHaveAttribute('href', '../');
    const box = await legacy.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
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
