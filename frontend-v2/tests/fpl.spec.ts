import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const squad = [
  p(112, 'Verbruggen', 'GKP', 'Brighton', 4.7, 86, .11, .02, 9, 11, 4.5, 9),
  p(60, 'Forster', 'GKP', 'Spurs', 2.4, 18, .02, .00, 5, 7, 4.0, 2),
  p(11, 'Mosquera', 'DEF', 'Arsenal', 5.6, 84, .13, .02, 11, 13, 5.5, 18),
  p(426, "O'Reilly", 'DEF', 'Man City', 6.33, 77, .155, .028, 12, 13, 6.5, 11),
  p(514, 'N.Williams', 'DEF', "Nott'm Forest", 5.3, 83, .12, .02, 10, 12, 5.0, 14),
  p(461, 'Dalot', 'DEF', 'Man Utd', 4.0, 59, .08, .01, 9, 11, 5.0, 8),
  p(188, 'van Ewijk', 'DEF', 'Coventry City', 3.7, 81, .06, .01, 8, 10, 4.0, 5),
  p(470, 'B.Fernandes', 'MID', 'Man Utd', 6.66, 82, .231, .054, 13, 15, 12.0, 31),
  p(471, 'Mbeumo', 'MID', 'Man Utd', 6.83, 79, .239, .067, 13, 16, 8.0, 24),
  p(29, 'Tzolis', 'MID', 'Brighton', 5.5, 73, .18, .04, 12, 14, 6.5, 9),
  p(161, 'Palmer', 'MID', 'Chelsea', 6.1, 85, .21, .05, 13, 15, 9.5, 38),
  p(436, 'Semenyo', 'MID', 'Bournemouth', 5.8, 84, .19, .04, 12, 14, 8.5, 16),
  p(170, 'João Pedro', 'FWD', 'Chelsea', 6.0, 82, .20, .05, 13, 15, 7.5, 22),
  p(417, 'Isak', 'FWD', 'Liverpool', 6.2, 83, .22, .06, 13, 16, 9.0, 28),
  p(290, 'Kusi-Asare', 'FWD', 'Fulham', 2.0, 22, .03, .00, 5, 7, 4.5, 1),
];

const allPredictions = [
  ...squad,
  p(427, 'Guéhi', 'DEF', 'Man City', 7.04, 86, .229, .05, 13, 14, 6.0, 18),
  p(355, 'Haaland', 'FWD', 'Man City', 6.95, 88, .245, .07, 14, 17, 14.5, 48),
  p(233, 'Saka', 'MID', 'Arsenal', 6.45, 84, .225, .055, 13, 16, 10.5, 35),
];

function p(id: number, name: string, position: string, team: string, xPts: number, xMin: number, p10: number, p15: number, q90: number, q95: number, price: number, ownership: number) {
  return {
    id, name, position, team, price, price_tenths: Math.round(price * 10), ownership_percent: ownership,
    expected_points: xPts, expected_minutes: xMin, p_blank: .25, p_5_plus: .62, p_10_plus: p10, p_15_plus: p15, p_20_plus: p15 / 5,
    q90, q95, distribution_version: 'current_fixture_event_distribution_v0.3_blank_le3', tail_semantics: 'direct_current_fixture_event_distribution',
  };
}

function fplPayload(gameweek: number) {
  return {
    ok: true,
    gameweek,
    prediction_run_id: gameweek === 3 ? 1256 : 1300,
    model_version: '0.3',
    current_model_version: '0.3',
    generated_at: '2026-09-01T20:05:00.417983+00:00',
    run_type: 'pre_deadline',
    squad,
    all_predictions: allPredictions,
    top_double_digit: allPredictions.slice(0, 10),
    fixture_results: [],
  };
}

function managerPayload(gameweek: number) {
  return {
    ok: true,
    gameweek,
    available_gameweeks: [3, 4],
    plan: {
      id: gameweek === 3 ? 3 : 4,
      gameweek,
      captured_at: '2026-08-31T22:43:34.107861+00:00',
      status: 'PROVISIONAL_HOLD_POST_GW2_PENDING_TRANSFER_DEADLINE_AND_PRESSERS',
      horizon: '3-5 GW',
      transfers: [],
      captain_player_id: 470,
      vice_player_id: 471,
      starting_xi: [112, 11, 426, 514, 29, 161, 470, 436, 471, 170, 417],
      bench_order: [60, 461, 188, 290],
      chip: 'NONE',
      gw_expected_xi_points: '58.2523',
      expected_gain_current_gw: '0',
      expected_gain_horizon: '0',
      risk_level: 'MEDIUM',
      rationale: {
        decision: 'HOLD tonight and preserve both free transfers',
        why_hold: [
          'Club press conferences and final predicted lineups are still pending',
          'Noise-Control requires a robust edge over rolling; no move should be forced before those inputs resolve',
        ],
        fresh_xi_note: 'The latest run prefers João Pedro in the XI; do not anchor to the prior starting XI.',
      },
      source: 'post_gw2_noise_control_run1244_v1',
      supersedes_id: 2,
    },
    manager_state: gameweek === 3 ? {
      id: 1,
      gameweek: 3,
      captured_at: '2026-09-01T23:57:35.956829+00:00',
      free_transfers: 2,
      bank_tenths: 0,
      acquisition_squad_cost_tenths: 1000,
      source: 'C0179_DERIVED_AUDITED_MANAGER_STATE_V1',
      evidence: { change_id: 'C0179', missing_is_not_zero: true },
    } : null,
  };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/fpl-api**', async (route) => {
    const gw = Number(new URL(route.request().url()).searchParams.get('gw') || 3);
    await route.fulfill({ json: fplPayload(gw) });
  });
  await page.route('**/fpl-manager-plan-api**', async (route) => {
    const gw = Number(new URL(route.request().url()).searchParams.get('gw') || 3);
    await route.fulfill({ json: managerPayload(gw) });
  });
});

test('FPL workspace keeps saved manager action primary and current projections explicitly secondary', async ({ page }) => {
  await page.goto('/?view=fpl&gw=3');
  await expect(page.getByRole('heading', { level: 1, name: 'FPL decision workspace' })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('HOLD / ROLL', { exact: true })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('2 FT', { exact: true })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('£0.0m', { exact: true })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('No chip', { exact: true })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('Medium', { exact: true })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('B.Fernandes', { exact: true })).toBeVisible();
  await expect(page.locator('.fpl-decision-board').getByText('Mbeumo', { exact: true })).toBeVisible();
  await expect(page.locator('.compact-selection').filter({ hasText: 'XI · 11/11' })).toContainText('João Pedro');
  await expect(page.locator('.compact-selection').filter({ hasText: 'Bench · 4/4' })).toContainText('Dalot');
  await expect(page.locator('.projection-separation').getByText('Run #1256', { exact: true })).toBeVisible();
  await expect(page.getByText(/Latest projection is 21h newer than the saved plan/)).toBeVisible();
  await expect(page.getByText(/analysis only and is not a saved manager decision/)).toBeVisible();

  const captainLens = page.locator('.distribution-card').filter({ hasText: 'Saved captain' });
  await expect(captainLens).toContainText('6.66');
  await expect(captainLens).toContainText('23%');
  await expect(captainLens).toContainText('5%');
  await expect(captainLens).toContainText('13');
  await expect(captainLens).toContainText('15');
  await expect(page.getByText(/ceiling/i)).toHaveCount(0);

  const fullPoolSummary = page.locator('.full-pool-details summary');
  const box = await fullPoolSummary.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await fullPoolSummary.click();
  await expect(page.locator('.projection-leader')).toHaveCount(8);
  await expect(page.locator('.projection-leader').first()).toContainText('Guéhi');
  await expect(page.getByText('Secondary model view · not transfer recommendations')).toBeVisible();

  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations).toEqual([]);
});

test('missing manager state fails closed instead of turning missing FT or bank into zero', async ({ page }) => {
  await page.goto('/?view=fpl&gw=4');
  const board = page.locator('.fpl-decision-board');
  await expect(board.getByText('HOLD / ROLL', { exact: true })).toBeVisible();
  const metrics = board.locator('.fpl-plan-metric');
  await expect(metrics.nth(0)).toContainText('—');
  await expect(metrics.nth(1)).toContainText('—');
  await expect(board.getByText('0 FT', { exact: true })).toHaveCount(0);
  await expect(board.getByText('£0.0m', { exact: true })).toHaveCount(0);
});
