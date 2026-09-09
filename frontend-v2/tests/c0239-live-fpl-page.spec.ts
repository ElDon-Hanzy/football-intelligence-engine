import { expect, test } from '@playwright/test';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live browser integration runs once per CI matrix.');
}

test('C0239 live GW4 FPL page renders the current C0237 manager plan', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto('/?view=fpl&gw=4');
  await expect(page.getByRole('heading', { level: 1, name: 'FPL decision workspace' })).toBeVisible();
  await expect(page.getByText('Live decision publication', { exact: true })).toBeVisible();
  await expect(page.getByText('Best current plan · CONTESTED', { exact: true })).toBeVisible();
  await expect(page.getByText('Contested · not final', { exact: true })).toBeVisible();

  const board = page.locator('.fpl-decision-board');
  await expect(board).toBeVisible();
  await expect(board.getByText('Best current engine plan · Contested', { exact: true })).toBeVisible();
  await expect(board.getByText('Gabriel', { exact: true }).first()).toBeVisible();
  await expect(board.getByText('B.Fernandes', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.compact-selection').filter({ hasText: 'XI · 11/11' })).toBeVisible();
  await expect(page.locator('.compact-selection').filter({ hasText: 'Bench · 4/4' })).toBeVisible();
});
