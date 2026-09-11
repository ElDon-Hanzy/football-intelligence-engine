import { expect, test } from '@playwright/test';

const payload = {
  ok: true,
  gameweek: 4,
  active_model: '0.1.3',
  active_generated_at: '2026-09-11T22:58:23Z',
  frozen_prediction_run_id: 1362,
  summary: {
    frozen_xi_xpts: 52.02,
    current_xi_xpts: 52.02,
    benchmark_xi_xpts: null,
    benchmark_xi_matched: 0,
    matched_players: 0,
    mae: null,
    bias: null,
  },
  validation: {
    forward: {
      available: true,
      selected_ablation_key: 'A0005',
      coverage: {
        predictions: 140,
        evaluations: 140,
        cohort_fixtures: 20,
        splits: [
          { split: 'VALIDATION', gameweek: 2, fixtures: 10 },
          { split: 'TEST', gameweek: 3, fixtures: 10 },
        ],
      },
      variants: [
        { variant_key: 'BASE_V03_ELO', split: 'VALIDATION', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .647941, avg_score_log_loss: 3.17, direction_accuracy: .5 },
        { variant_key: 'FULL_V04_ELO_NO_SCHEDULE', split: 'VALIDATION', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .628130, avg_score_log_loss: 3.13, direction_accuracy: .6 },
        { variant_key: 'BASE_V03_ELO', split: 'TEST', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .685634, avg_score_log_loss: 3.26, direction_accuracy: .3 },
        { variant_key: 'FULL_V04_ELO_NO_SCHEDULE', split: 'TEST', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .684519, avg_score_log_loss: 3.25, direction_accuracy: .3 },
      ],
    },
    retrospective: [],
  },
};

test('Performance selects the newest fully evaluated forward Gameweek and never calls live GW realised', async ({ page }) => {
  await page.route('**/calibration-summary**', async (route) => route.fulfill({ json: payload }));
  await page.goto('/?view=performance&gw=4');

  await expect(page.getByRole('heading', { level: 1, name: 'Performance' })).toBeVisible();
  await expect(page.getByText('Gameweek 4 · performance through GW3', { exact: true })).toBeVisible();
  await expect(page.getByText(/Gameweek 4 · realised accuracy/i)).toHaveCount(0);

  const hero = page.locator('.analysis-hero');
  await expect(hero.getByRole('heading', { name: 'GW3 · 10 fixtures' })).toBeVisible();
  await expect(hero.getByText('30%', { exact: true })).toHaveCount(2);
  await expect(hero.getByText('0.685', { exact: true })).toBeVisible();
  await expect(hero.getByText('0.686', { exact: true })).toBeVisible();
  await expect(hero.getByText(/GW3 test/i)).toHaveCount(0);

  await expect(page.getByText('GW3 · Forward test', { exact: true })).toBeVisible();
  await expect(page.getByText('GW2 · Forward validation', { exact: true })).toBeVisible();
});
