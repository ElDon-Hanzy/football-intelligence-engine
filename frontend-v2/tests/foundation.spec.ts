import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('foundation is responsive, accessible and free of horizontal overflow', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Football Intelligence Engine' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  const legacyLink = page.getByRole('link', { name: 'Open legacy UI' });
  const box = await legacyLink.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
