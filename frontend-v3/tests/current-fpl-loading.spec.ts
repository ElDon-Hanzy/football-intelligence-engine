import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

async function routeCurrentFpl(
  page: Page,
  defaultActualGameweek: number,
  counters: { defaultActual: number; explicitActual: number },
) {
  await page.route('**/gameweek-status-api**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        live_gameweek: 4,
        latest_intelligence_gameweek: 5,
        planning_horizon_gameweek: 8,
      }),
    });
  });

  await page.route('**/fpl-v3-workspace-api**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...gw4WorkspaceFixture, gameweek: 4 }),
    });
  });

  await page.route('**/fpl-v3-actual-live-api**', async (route) => {
    const url = new URL(route.request().url());
    const requested = Number(url.searchParams.get('gw') ?? 0);
    if (requested > 0) {
      counters.explicitActual += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...gw4ActualLiveFixture, gameweek: requested }),
      });
      return;
    }

    counters.defaultActual += 1;
    await new Promise((resolve) => setTimeout(resolve, 75));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...gw4ActualLiveFixture, gameweek: defaultActualGameweek }),
    });
  });
}

test('current FPL reuses the matching default actual/live request instead of issuing an explicit duplicate', async ({ page }) => {
  const counters = { defaultActual: 0, explicitActual: 0 };
  await routeCurrentFpl(page, 4, counters);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-gameweek', '4');
  await expect(page.locator('.v3-fpl-hero .v3-kicker')).toContainText('Gameweek 4');

  expect(counters.defaultActual).toBe(1);
  expect(counters.explicitActual).toBe(0);
});

test('current FPL refuses to combine mismatched default actual/live truth with the workspace Gameweek', async ({ page }) => {
  const counters = { defaultActual: 0, explicitActual: 0 };
  await routeCurrentFpl(page, 5, counters);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-gameweek', '4');
  await expect(page.locator('.v3-fpl-hero .v3-kicker')).toContainText('Gameweek 4');

  expect(counters.defaultActual).toBe(1);
  expect(counters.explicitActual).toBe(1);
});
