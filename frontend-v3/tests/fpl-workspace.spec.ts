import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

async function loadWorkspace(page: Parameters<typeof test>[0] extends never ? never : any) {
  await page.route('**/fpl-v3-workspace-api**', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(gw4WorkspaceFixture),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
}

test('Engine pitch is formation-aware and does not manufacture authorization', async ({ page }) => {
  await loadWorkspace(page);

  await expect(page.getByText('3-5-2', { exact: true })).toBeVisible();
  await expect(page.getByText('Gabriel', { exact: true })).toBeVisible();
  await expect(page.getByText('Final frozen recommendation · not authorized', { exact: true })).toBeVisible();
  await expect(page.getByText('1', { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText('£1.4m', { exact: true })).toBeVisible();
});

test('Actual state fails closed when the submitted team is not verified', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'Actual' }).click();

  await expect(page.getByRole('heading', { name: 'Actual submitted team not verified' })).toBeVisible();
  await expect(page.locator('.v3-fpl-pitch')).toHaveCount(0);
  await expect(page.getByText('The engine recommendation is intentionally not substituted here.')).toBeVisible();
});

test('Live mode distinguishes live from frozen projection evidence', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'Live' }).click();

  await expect(page.getByText('LIVE', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Frozen 6.2 xPts', { exact: true })).toBeVisible();
  await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Next', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Any model probability is frozen pre-match evidence, not a current forecast.').first()).toBeVisible();
});

test('List View remains secondary and preserves captain/fixture evidence', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('button', { name: 'List' }).click();

  await expect(page.getByRole('heading', { name: 'Starting XI' })).toBeVisible();
  await expect(page.locator('.v3-fpl-pitch')).toHaveCount(0);
  await expect(page.getByText('Gabriel', { exact: true })).toBeVisible();
  await expect(page.getByText('ARS · SUN (A)', { exact: true })).toBeVisible();
});

test('responsive shell has no page-level horizontal overflow', async ({ page }, testInfo) => {
  await loadWorkspace(page);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
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
