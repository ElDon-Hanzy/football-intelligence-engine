import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4ActualLiveFixture, gw4ActualUnverifiedFixture } from './fixtures/gw4ActualLive';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

async function loadWorkspace(page: Page, actual = gw4ActualLiveFixture) {
  await page.route('**/fpl-v3-workspace-api**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gw4WorkspaceFixture) });
  });
  await page.route('**/fpl-v3-actual-live-api**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(actual) });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
}

test('Engine pitch is formation-aware and remains separate from submitted-team truth', async ({ page }) => {
  await loadWorkspace(page);
  await expect(page.getByText('3-5-2', { exact: true })).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' }).first()).toBeVisible();
  await expect(page.getByText('FINAL FROZEN NOT AUTHORIZED', { exact: true })).toBeVisible();
  await expect(page.getByText('£1.4m', { exact: true })).toBeVisible();
  await expect(page.getByText('Actual team verified from FPL', { exact: true })).toBeVisible();
});

test('Actual state renders the locked submitted squad rather than the engine recommendation', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'Actual' }).click();
  await expect(page.getByRole('heading', { name: 'Actual submitted team' })).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Calafiori' }).first()).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Palmer' }).first()).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' })).toHaveCount(0);
  await expect(page.getByText('Automatically verified from the public FPL picks endpoint after Gameweek lock.')).toBeVisible();
});

test('browser refresh reads persisted APIs and never invokes the post-lock sync function', async ({ page }) => {
  let syncRequests = 0;
  await page.route('**/sync-fpl-actual-decision**', async (route) => {
    syncRequests += 1;
    await route.abort();
  });
  await loadWorkspace(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
  expect(syncRequests).toBe(0);
});

test('Actual and Live fail closed when submitted picks are not verified', async ({ page }) => {
  await loadWorkspace(page, gw4ActualUnverifiedFixture);
  await page.getByRole('tab', { name: 'Actual' }).click();
  await expect(page.getByRole('heading', { name: 'Actual submitted team not verified' })).toBeVisible();
  await expect(page.locator('.v3-fpl-pitch')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Live' }).click();
  await expect(page.getByRole('heading', { name: 'Actual submitted team not verified' })).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' })).toHaveCount(0);
});

test('Live mode shows realized results for actual submitted players only', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'Live' }).click();
  const tzolis = page.locator('.v3-player-card').filter({ hasText: 'Tzolis' }).first();
  await expect(tzolis).toContainText('4 pts');
  await expect(tzolis).toContainText('Live · provisional');
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Calafiori' }).first()).toContainText('6 pts');
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' })).toHaveCount(0);
  await expect(page.getByText('Engine ≠ Actual ≠ Live result', { exact: true })).toBeVisible();
});

test('Player cards open frozen projection and realized FPL intelligence', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'Live' }).click();
  await page.getByRole('button', { name: /Open João Pedro intelligence/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'João Pedro' })).toBeVisible();
  await expect(page.getByText('Frozen decision-time projection', { exact: true })).toBeVisible();
  await expect(page.getByText('Realized FPL evidence', { exact: true })).toBeVisible();
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
});

test('List View remains secondary and preserves engine captain/fixture evidence', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('button', { name: 'List' }).click();
  await expect(page.getByRole('heading', { name: 'Starting XI' })).toBeVisible();
  await expect(page.locator('.v3-fpl-pitch')).toHaveCount(0);
  const gabrielRow = page.locator('.v3-list-player').filter({ hasText: 'Gabriel' });
  await expect(gabrielRow).toBeVisible();
  await expect(gabrielRow).toContainText('ARS · SUN (A)');
});

test('responsive shell has no page-level horizontal overflow', async ({ page }, testInfo) => {
  await loadWorkspace(page);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth, `${testInfo.project.name} page overflow`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('.v3-desktop-nav')).toBeVisible();
    await expect(page.locator('.v3-mobile-nav')).toBeHidden();
  } else {
    await expect(page.locator('.v3-mobile-nav')).toBeVisible();
  }
});

test('critical/serious accessibility violations are absent', async ({ page }) => {
  await loadWorkspace(page);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
  expect(blocking).toEqual([]);
});
