import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gw4WorkspaceFixture } from './fixtures/gw4Workspace';

async function mockWorkspace(page: Page) {
  await page.route('**/fpl-v3-workspace-api**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(gw4WorkspaceFixture),
    });
  });
}

async function assertNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('all five V3 navigation destinations render real product surfaces', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();

  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.getByRole('heading', { name: 'Football intelligence, distilled to what matters now.' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-active-view', 'home');

  await page.getByRole('link', { name: 'Matches' }).first().click();
  await expect(page.getByRole('heading', { name: 'Every fixture in its real state.' })).toBeVisible();
  await expect(page.locator('.v3-match-card')).toHaveCount(10);

  await page.getByRole('link', { name: 'Insights' }).first().click();
  await expect(page.getByRole('heading', { name: 'Decision intelligence without pretending noise is certainty.' })).toBeVisible();
  await expect(page.getByText('Highest P10+ inside the recommended squad')).toBeVisible();

  await page.getByRole('link', { name: 'History' }).first().click();
  await expect(page.getByRole('heading', { name: 'Judge the decision from the evidence that existed then.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Projection vs realized' })).toBeVisible();

  await page.getByRole('link', { name: 'FPL' }).first().click();
  await expect(page.getByRole('heading', { name: 'Pick the state. Read the pitch.' })).toBeVisible();
});

test('hash routes survive direct entry and browser history', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/#matches');
  await expect(page.getByRole('heading', { name: 'Every fixture in its real state.' })).toBeVisible();

  await page.getByRole('link', { name: 'Insights' }).first().click();
  await expect(page.locator('main')).toHaveAttribute('data-active-view', 'insights');
  await page.goBack();
  await expect(page.locator('main')).toHaveAttribute('data-active-view', 'matches');
});

test('all non-FPL V3 pages stay responsive and avoid serious accessibility violations', async ({ page }) => {
  await mockWorkspace(page);

  for (const view of ['home', 'matches', 'insights', 'history'] as const) {
    await page.goto(`/#${view}`);
    await expect(page.locator('main')).toHaveAttribute('data-active-view', view);
    await assertNoOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
    expect(blocking, `${view} accessibility`).toEqual([]);
  }
});
