import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

type Counters = { defaultActual: number; explicitActual: number };

async function routeCurrentFpl(page: Page, actualResponseGameweek: number, counters: Counters) {
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
    const requested = Number(new URL(route.request().url()).searchParams.get('gw') ?? 0);
    if (requested <= 0) {
      counters.defaultActual += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...gw4ActualLiveFixture, gameweek: actualResponseGameweek }),
      });
      return;
    }

    counters.explicitActual += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...gw4ActualLiveFixture, gameweek: actualResponseGameweek }),
    });
  });
}

test('current FPL requests the catalog-resolved Gameweek explicitly and concurrently', async ({ page }) => {
  const counters = { defaultActual: 0, explicitActual: 0 };
  await routeCurrentFpl(page, 4, counters);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-gameweek', '4');
  await expect(page.locator('.v3-fpl-hero .v3-kicker')).toContainText('Gameweek 4');

  expect(counters.defaultActual).toBe(0);
  expect(counters.explicitActual).toBe(1);
});

test('current FPL fails closed when concurrent actual/live returns another Gameweek', async ({ page }) => {
  const counters = { defaultActual: 0, explicitActual: 0 };
  await routeCurrentFpl(page, 5, counters);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'FPL workspace is unavailable.' })).toBeVisible();
  await expect(page.getByText('Actual-live Gameweek mismatch: requested GW4, received GW5')).toBeVisible();

  expect(counters.defaultActual).toBe(0);
  expect(counters.explicitActual).toBe(1);
});
