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
  await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
}

test('Engine pitch is formation-aware and remains separate from submitted-team truth', async ({ page }) => {
  await loadWorkspace(page);
  await expect(page.getByText('3-5-2', { exact: true })).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' }).first()).toBeVisible();
  await expect(page.getByText('£1.4m', { exact: true })).toBeVisible();
  await expect(page.getByText('Submitted team verified', { exact: true })).toBeVisible();
  await expect(page.getByText('FINAL FROZEN NOT AUTHORIZED', { exact: true })).toHaveCount(0);
});

test('FPL primary summary is projected xPTS versus actual PTS while audit metadata is secondary', async ({ page }) => {
  await loadWorkspace(page);
  const scorecard = page.getByRole('region', { name: 'Projected xPTS versus Actual PTS' });
  await expect(scorecard).toBeVisible();
  await expect(scorecard.getByText('XI xPTS', { exact: true })).toBeVisible();
  await expect(scorecard.getByText('Actual PTS', { exact: true })).toBeVisible();
  await expect(scorecard.getByText('vs xPTS', { exact: true })).toBeVisible();
  await expect(page.locator('.v3-lifecycle-strip')).toHaveCount(0);
  const details = page.locator('details.v3-data-details');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(details.getByText('Actual source', { exact: true })).toBeHidden();
  await details.getByText('Data details', { exact: true }).click();
  await expect(details.getByText('Actual source', { exact: true })).toBeVisible();
  await expect(details.getByText('FPL locked picks', { exact: true })).toBeVisible();
  await expect(details.getByText('Run #1365', { exact: true })).toBeVisible();
});

test('My team renders locked submitted picks rather than the engine recommendation', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'My team' }).click();
  await expect(page.getByRole('heading', { name: 'My submitted team' })).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Calafiori' }).first()).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Palmer' }).first()).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' })).toHaveCount(0);
  await expect(page.getByText('The team submitted to FPL at the Gameweek lock.')).toBeVisible();
});

test('browser refresh reads persisted APIs and never invokes the post-lock sync function', async ({ page }) => {
  let syncRequests = 0;
  await page.route('**/sync-fpl-actual-decision**', async (route) => {
    syncRequests += 1;
    await route.abort();
  });
  await loadWorkspace(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your Gameweek' })).toBeVisible();
  expect(syncRequests).toBe(0);
});

test('My team and Live fail closed when submitted picks are not verified', async ({ page }) => {
  await loadWorkspace(page, gw4ActualUnverifiedFixture);
  await page.getByRole('tab', { name: 'My team' }).click();
  await expect(page.getByRole('heading', { name: 'Actual submitted team not verified' })).toBeVisible();
  await expect(page.locator('.v3-fpl-pitch')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Live' }).click();
  await expect(page.getByRole('heading', { name: 'Actual submitted team not verified' })).toBeVisible();
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' })).toHaveCount(0);
});

test('Live mode compares actual points with frozen xPts for actual submitted players only', async ({ page }) => {
  await loadWorkspace(page);
  await page.getByRole('tab', { name: 'Live' }).click();
  const tzolis = page.locator('.v3-player-card').filter({ hasText: 'Tzolis' }).first();
  await expect(tzolis).toContainText('4 pts');
  await expect(tzolis).toContainText('4.9 xPts');
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Calafiori' }).first()).toContainText('6 pts');
  await expect(page.locator('.v3-player-card').filter({ hasText: 'Gabriel' })).toHaveCount(0);
  await expect(page.getByText('Player cards show Actual PTS against the frozen xPts for the same player.', { exact: true })).toBeVisible();
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
  await expect(page.getByLabel('Select Gameweek')).toBeVisible();
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
