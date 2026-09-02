import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const selections = ['1-1', '2-1', '1-0', '2-0'];
const fixtures = Array.from({ length: 10 }, (_, index) => ({
  match_id: 25 + index,
  kickoff_time: `2026-09-0${index < 5 ? 4 : 6}T${String(12 + index).padStart(2, '0')}:00:00+00:00`,
  finished: false,
  home_team: index === 0 ? 'Fulham' : `Home ${index}`,
  away_team: index === 0 ? 'Crystal Palace' : `Away ${index}`,
  home_short: index === 0 ? 'FUL' : `H${index}`,
  away_short: index === 0 ? 'CRY' : `A${index}`,
  prediction: { snapshot_id: 211 + index, source_change_id: 'C0166', captured_at: '2026-09-01T21:03:00+00:00', markets: index === 0 ? { home_win: .3819, draw: .2433, away_win: .3745 } : { home_win: .52, draw: .25, away_win: .23 }, top_scorelines: [{ score: index === 0 ? '1-1' : '2-1', prob: .112 }] },
  bookmaker_odds: index < 4 ? [
    { bookmaker: 'Book A', bookmaker_family: 'Book A', market_key: 'h2h', selection_key: 'home', selection_name: index === 0 ? 'Fulham' : `Home ${index}`, decimal_odds: 2.8, implied_probability: .3571 },
  ] : [],
  correct_score_odds: index < 4 ? [{ bookmaker: 'Book A', bookmaker_family: 'Book A', market_key: 'correct_score', selection_key: selections[index], selection_name: selections[index], decimal_odds: 7.5 + index, implied_probability: .1333 }] : [],
  bookmaker_count: index < 4 ? 1 : null,
  bookmaker_source_count: index < 4 ? 1 : null,
  market_count: index < 4 ? 2 : null,
  edge_research: index < 4 ? { status: 'UNVALIDATED', model_effect_enabled: false, observation_count: 3, robust_positive_ev_count: 1, top_robust_positive_ev: [{ selection_name: selections[index], bookmaker: 'Book A', decimal_odds: 7.5 + index, model_probability: .14 - index * .005, expected_value: .12 - index * .01, min_edge_across_methods: .06 - index * .005, evidence_quality: 'HIGH' }] } : null,
  price_tracking: null,
  clv_research: null,
}));

const bettingPayload = { ok: true, gameweek: 3, odds_status: 'connected', value_edge_available: false, research_edge_available: true, price_tracking_available: false, clv_research_available: false, warnings: [], fixtures };

const calibrationPayload = {
  ok: true, gameweek: 3, active_model: '0.3', active_generated_at: '2026-09-01T20:05:00Z', frozen_prediction_run_id: 1256,
  summary: { frozen_xi_xpts: 57.8, current_xi_xpts: 58.3, benchmark_xi_xpts: 56.9, benchmark_xi_matched: 11, matched_players: 15, mae: .42, bias: .08 },
  validation: {
    forward: {
      available: true, selected_ablation_key: 'A0005', coverage: { predictions: 140, evaluations: 70, cohort_fixtures: 20, splits: [{ split: 'VALIDATION', gameweek: 2, fixtures: 10 }, { split: 'TEST', gameweek: 3, fixtures: 10 }] }, integrity: { prediction_actual_data_violations: 0 },
      variants: [
        { variant_key: 'BASE_V03_ELO', split: 'VALIDATION', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .64794, avg_score_log_loss: 3.173, direction_accuracy: .5, exact_top_score_rate: .1, avg_process_mae: null, avg_gap_error: null },
        { variant_key: 'FULL_V04_ELO_NO_SCHEDULE', split: 'VALIDATION', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .62813, avg_score_log_loss: 3.1295, direction_accuracy: .6, exact_top_score_rate: .2, avg_process_mae: null, avg_gap_error: null },
        { variant_key: 'FULL_V04_ELO_NO_SCHEDULE', split: 'TEST', total_predictions: 10, evaluated_fixtures: 0, pending_fixtures: 10, avg_brier: null, avg_score_log_loss: null, direction_accuracy: null, exact_top_score_rate: null, avg_process_mae: null, avg_gap_error: null },
      ], latest_promotion_gate: null,
    },
    retrospective: [
      { gameweek: 1, evaluated_fixtures: 10, direction_accuracy: .6, exact_top_score_rate: .2, avg_brier: .63, avg_score_log_loss: 3.13 },
      { gameweek: 1, evaluated_fixtures: 10, direction_accuracy: .5, exact_top_score_rate: .1, avg_brier: .65, avg_score_log_loss: 3.18 },
    ],
  },
};

const enginePayload = {
  ok: true, gameweek: 3, generated_at: '2026-09-02T00:55:00Z',
  active_model: { id: 3, version: '0.3', description: 'Current model', config: {}, is_active: true, created_at: '2026-08-20T00:00:00Z' },
  latest_prediction_run: { id: 1256, gameweek: 3, generated_at: '2026-09-01T20:05:00Z', run_type: 'pre_deadline', frozen: false, excluded_from_backtest: false },
  production_fixture_layer: { fixtures: 10, latest_snapshot_id: 216, latest_captured_at: '2026-09-01T21:03:00Z', change_ids: ['C0166'] },
  governance: { ok: true, total_rows: 108, decision_rows: 50, bad_change_ids: 0, completed_not_verified: 0, completed_without_refs: 0, decision_rows_without_refs: 0 },
  decision_evidence_audit: { ok: true, fixtures_audited: 10, hard_violations: 0 }, production_evidence_audit: { ok: true, fixtures_audited: 10, hard_violations: 0 },
  experiments: { A0005: { ok: true, decision_state: 'GW2_COMPLETE_REVIEW_ONLY_NO_TUNING', coverage: { fixtures: 20, evaluations: 70, predictions: 140 }, integrity: { run_violations: 0 } }, W0002: { ok: true, decision_state: 'ACCUMULATING_GW4_VALIDATION', coverage: { fixtures: 20, evaluations: 0 }, integrity: { run_violations: 0 } } },
  source_health: { zero_cost: { change_id: 'C0139', sources: [{ source_key: 'fotmob_public', available: 6, blocked: 2, any_current_epl_scope: true, any_production_ready: false }], integrity_violations: { model_effect_enabled: 0 } }, fotmob_metrics: { change_id: 'C0139', rows: 2138, usable_rows: 1069, integrity_violations: { model_effect_enabled: 0 } }, physical_load: { change_id: 'C0140', rows: 20, latest_teams: 20, integrity_violations: { model_effect_enabled: 0 } } },
  semantics: { research_statuses_are_not_production_effects: true, missing_is_not_zero: true, immutable_historical_forecasts_preserved: true },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/betting-api**', async (route) => route.fulfill({ json: bettingPayload }));
  await page.route('**/calibration-summary**', async (route) => route.fulfill({ json: calibrationPayload }));
  await page.route('**/engine-diagnostics-api**', async (route) => route.fulfill({ json: enginePayload }));
});

test('Markets is Top-4 first and keeps fixture diagnostics secondary', async ({ page }) => {
  await page.goto('/?view=markets&gw=3');
  await expect(page.getByRole('heading', { level: 1, name: 'Markets' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top 4 Bets' })).toBeVisible();
  await expect(page.getByText('NO VALIDATED BET EDGE')).toHaveCount(0);
  await expect(page.locator('.top-bet-card')).toHaveCount(4);
  await expect(page.locator('.top-bet-card').first().getByText('FUL–CRY')).toBeVisible();
  await expect(page.locator('.top-bet-card').first().getByRole('heading', { name: '1-1' })).toBeVisible();
  await expect(page.locator('.top-bet-card').first().getByText('Research EV')).toBeVisible();
  await expect(page.locator('.market-card').first()).not.toBeVisible();
  await page.getByText('All fixture market diagnostics', { exact: true }).click();
  await expect(page.locator('.market-card')).toHaveCount(10);
  const firstCard = page.locator('.market-card').first();
  await expect(firstCard).toBeVisible();
  await expect(page.locator('.market-action-chip').filter({ hasText: 'NO MARKET DATA' })).toHaveCount(6);
  const research = firstCard.getByText('Research diagnostics', { exact: true });
  await research.click();
  await expect(firstCard.getByText('Research only · no production effect')).toBeVisible();
  await assertPageQuality(page);
});

test('Performance is human-first, shows GW2 forward evidence and keeps internal variants hidden', async ({ page }) => {
  await page.goto('/?view=performance&gw=3');
  await expect(page.getByRole('heading', { level: 1, name: 'Performance' })).toBeVisible();
  const hero = page.locator('.analysis-hero');
  await expect(hero.getByRole('heading', { name: 'GW2 · 10 fixtures' })).toBeVisible();
  await expect(hero.getByText('60%', { exact: true })).toBeVisible();
  await expect(page.getByText('GW2 · Forward validation')).toBeVisible();
  await expect(page.getByText('GW1 · Retrospective blind checks')).toBeVisible();
  await expect(page.getByText('2 engine runs')).toBeVisible();
  await expect(page.getByText('GW3 · Forward test')).toBeVisible();
  await expect(page.getByText('Forward validation variants')).toHaveCount(0);
  await expect(page.getByText('FULL_V04_ELO_NO_SCHEDULE')).toHaveCount(0);
  await assertPageQuality(page);
});

test('Engine keeps research diagnostics out of production semantics', async ({ page }) => {
  await page.goto('/?view=engine&gw=3');
  await expect(page.getByRole('heading', { level: 1, name: 'Engine & Research' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Model 0.3' })).toBeVisible();
  await expect(page.locator('.analysis-hero').getByText(/Current fixture layer: C0166/)).toBeVisible();
  await expect(page.getByText('Governance clean')).toBeVisible();
  await expect(page.getByText('Research only', { exact: true }).first()).toBeVisible();
  const width = page.viewportSize()?.width ?? 0;
  if (width <= 920) {
    const shortcut = page.getByRole('button', { name: 'Engine and research' });
    await expect(shortcut).toBeVisible();
    const box = await shortcut.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await assertPageQuality(page);
});

async function assertPageQuality(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations).toEqual([]);
}
