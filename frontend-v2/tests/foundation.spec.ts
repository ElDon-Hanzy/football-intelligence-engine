import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const gameweekStatusPayload = {
  ok: true,
  live_gameweek: 3,
  reason: 'NEXT_UNFINISHED_GAMEWEEK',
  as_of: '2026-09-02T01:00:00Z',
  schedule: [{
    gameweek: 3,
    fixtures: 10,
    finished: 0,
    unfinished: 10,
    first_kickoff: '2026-09-04T19:00:00Z',
    last_kickoff: '2026-09-06T15:30:00Z',
  }],
  teams: [],
  semantics: { frozen_projection_runs_do_not_define_live_gameweek: true },
};

const fplPayload = {
  ok: true,
  gameweek: 3,
  model_version: '0.1.3',
  generated_at: '2026-09-01T20:05:00Z',
  decision: { captain_player_id: 470, vice_player_id: 471 },
  squad: [
    { id: 470, name: 'Bruno Fernandes', team: 'Man Utd', position: 'MID', expected_points: 6.58, expected_minutes: 82, p_10_plus: 0.225 },
    { id: 471, name: 'Mbeumo', team: 'Man Utd', position: 'MID', expected_points: 6.73, expected_minutes: 79, p_10_plus: 0.232 },
  ],
  fixture_results: Array.from({ length: 10 }, (_, index) => ({
    match_id: 9000 + index,
    kickoff_time: `2026-09-0${index < 4 ? 4 : 6}T${String(12 + (index % 6)).padStart(2, '0')}:00:00+00:00`,
    finished: false,
    home_team: index === 0 ? 'Ipswich Town' : `Home ${index}`,
    away_team: index === 0 ? 'Liverpool' : `Away ${index}`,
    prediction: {
      markets: index === 0
        ? { home_win: 0.22, draw: 0.22, away_win: 0.56 }
        : { home_win: 0.42, draw: 0.28, away_win: 0.30 },
    },
  })),
};

const managerPlanPayload = {
  ok: true,
  gameweek: 3,
  available_gameweeks: [3],
  plan: {
    id: 3,
    gameweek: 3,
    captured_at: '2026-09-01T22:30:00+00:00',
    status: 'PROVISIONAL_HOLD_PENDING_PRESSERS',
    horizon: '3-5 GW',
    transfers: [],
    captain_player_id: 470,
    vice_player_id: 471,
    starting_xi: [112, 11, 426, 514, 29, 161, 470, 436, 471, 170, 417],
    bench_order: [60, 461, 188, 290],
    chip: 'NONE',
    risk_level: 'MEDIUM',
    rationale: { decision: 'Hold and preserve both free transfers pending the final information gate.' },
    source: 'test_manager_plan',
    supersedes_id: 2,
  },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/gameweek-status-api**', async (route) => route.fulfill({ json: gameweekStatusPayload }));
  await page.route('**/fpl-api**', async (route) => route.fulfill({ json: fplPayload }));
  await page.route('**/fpl-manager-plan-api**', async (route) => route.fulfill({ json: managerPlanPayload }));
});

test('command center is responsive, accessible and decision-first', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Command Center' })).toBeVisible();
  const decisionPanel = page.getByRole('region', { name: 'HOLD / ROLL' });
  await expect(decisionPanel).toBeVisible();
  await expect(decisionPanel.getByText('Bruno Fernandes')).toBeVisible();
  await expect(page.getByText('0/10')).toBeVisible();
  await expect(page.getByText('Ipswich Town vs Liverpool', { exact: true })).toBeVisible();
  await expect(page.getByText('Liverpool', { exact: true })).toBeVisible();

  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  const visibleNavigation = page.locator('nav:visible');
  await expect(visibleNavigation).toHaveCount(1);
  for (const control of await visibleNavigation.locator('button').all()) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const width = page.viewportSize()?.width ?? 0;
  if (width <= 920) {
    await expect(page.locator('.mobile-nav-wrap')).toBeVisible();
    await expect(page.locator('.side-rail')).toBeHidden();
  } else {
    await expect(page.locator('.side-rail')).toBeVisible();
    await expect(page.locator('.mobile-nav-wrap')).toBeHidden();
  }

  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('navigation opens the completed FPL workspace and gameweek controls update the URL', async ({ page }) => {
  await page.goto('/');
  const visibleNavigation = page.locator('nav:visible');
  await visibleNavigation.getByRole('button', { name: 'FPL' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'FPL decision workspace' })).toBeVisible();
  await expect(page).toHaveURL(/view=fpl/);
  await page.getByLabel('Gameweek').selectOption('3');
  await expect(page).toHaveURL(/gw=3/);
});
