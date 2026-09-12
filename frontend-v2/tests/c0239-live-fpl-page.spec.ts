import { expect, test } from '@playwright/test';
import { endpoints } from '../src/lib/api';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live browser integration runs once per CI matrix.');
}

test('C0239 GW4 FPL page respects live-publication versus historical lifecycle', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);

  const response = await page.request.get(`${endpoints.fpl}?gw=4`, { timeout: 30_000 });
  expect(response.ok()).toBe(true);
  const fpl = await response.json();

  await page.goto('/?view=fpl&gw=4');

  if (fpl.snapshot_stage === 'HISTORICAL_FROZEN') {
    await expect(page.getByRole('heading', { level: 1, name: 'FPL decision history' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Frozen model decision snapshot', { exact: true })).toBeVisible();
    await expect(page.locator('.compact-selection').filter({ hasText: 'Frozen XI · 11/11' })).toBeVisible();
    await expect(page.locator('.compact-selection').filter({ hasText: 'Frozen bench · 4/4' })).toBeVisible();
    return;
  }

  await expect(page.getByRole('heading', { level: 1, name: 'FPL decision workspace' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Live decision publication', { exact: true })).toBeVisible();

  const board = page.locator('.fpl-decision-board');
  await expect(board).toBeVisible();
  await expect(page.locator('.compact-selection').filter({ hasText: 'XI · 11/11' })).toBeVisible();
  await expect(page.locator('.compact-selection').filter({ hasText: 'Bench · 4/4' })).toBeVisible();
});
