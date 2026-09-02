import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { visualBaselines } from './visual-baselines';

const players = Array.from({ length: 15 }, (_, index) => ({
  id: index + 1,
  name: ['Bruno Fernandes','Mbeumo','Palmer','Semenyo','Tzolis','João Pedro','Isak','Verbruggen','Mosquera',"O'Reilly",'N. Williams','Forster','Dalot','van Ewijk','Kusi-Asare'][index],
  team: ['Man Utd','Man Utd','Chelsea','Bournemouth','Brighton','Chelsea','Liverpool','Brighton','Arsenal','Man City',"Nott'm Forest",'Spurs','Man Utd','Coventry City','Fulham'][index],
  position: index === 7 || index === 11 ? 'GKP' : index >= 8 && index <= 13 ? 'DEF' : index >= 5 && index <= 6 || index === 14 ? 'FWD' : 'MID',
  price: 4.5 + index * 0.4,
  price_tenths: 45 + index * 4,
  ownership_percent: 5 + index * 2,
  expected_points: 6.8 - index * 0.18,
  expected_minutes: 88 - index,
  p_blank: .25,
  p_5_plus: .62,
  p_10_plus: Math.max(.05, .24 - index * .008),
  p_15_plus: Math.max(.01, .065 - index * .003),
  p_20_plus: .01,
  q90: Math.max(7, 14 - Math.floor(index / 3)),
  q95: Math.max(9, 17 - Math.floor(index / 3)),
  distribution_version: 'current_fixture_event_distribution_v0.3_blank_le3',
  tail_semantics: 'direct_current_fixture_event_distribution',
}));

const fixtureResults = Array.from({ length: 10 }, (_, index) => {
  const markets = index === 0 ? { home_win: .22, draw: .22, away_win: .56 }
    : index === 1 ? { home_win: .3819, draw: .2433, away_win: .3745 }
    : index === 2 ? { home_win: .4055, draw: .2592, away_win: .3351 }
    : { home_win: .52, draw: .25, away_win: .23 };
  return {
    match_id: 25 + index,
    kickoff_time: `2026-09-${index < 5 ? '04' : '06'}T${String(12 + index).padStart(2, '0')}:00:00+00:00`,
    home_team: index === 0 ? 'Ipswich Town' : index === 1 ? 'Fulham' : index === 2 ? "Nott'm Forest" : `Home ${index}`,
    away_team: index === 0 ? 'Liverpool' : index === 1 ? 'Crystal Palace' : index === 2 ? 'Spurs' : `Away ${index}`,
    home_short: index === 0 ? 'IPS' : index === 1 ? 'FUL' : index === 2 ? 'NFO' : `H${index}`,
    away_short: index === 0 ? 'LIV' : index === 1 ? 'CRY' : index === 2 ? 'TOT' : `A${index}`,
    finished: false,
    prediction: {
      snapshot_id: 211 + index,
      source_change_id: 'C0166',
      captured_at: '2026-09-01T21:03:00+00:00',
      markets,
      home_lambda: 1.45,
      away_lambda: 1.35,
      headline_score: index === 0 ? '1-2' : '1-1',
      headline_score_probability: .11,
      raw_modal_score: '1-1',
      top_scorelines: [{ score: index === 0 ? '1-2' : '1-1', prob: .11 }, { score: '1-0', prob: .09 }],
    },
  };
});

const gameweekStatusPayload = {
  ok: true,
  live_gameweek: 3,
  reason: 'NEXT_UNFINISHED_GAMEWEEK',
  as_of: '2026-09-02T01:00:00Z',
  schedule: [{ gameweek: 3, fixtures: 10, finished: 0, unfinished: 10, first_kickoff: '2026-09-04T19:00:00Z', last_kickoff: '2026-09-06T15:30:00Z' }],
  teams: fixtureResults.flatMap((fixture, index) => [
    { id: 100 + index * 2, fpl_team_id: 1 + index * 2, name: fixture.home_team, short_name: fixture.home_short, team_code: 200 + index * 2 },
    { id: 101 + index * 2, fpl_team_id: 2 + index * 2, name: fixture.away_team, short_name: fixture.away_short, team_code: 201 + index * 2 },
  ]),
  semantics: { frozen_projection_runs_do_not_define_live_gameweek: true },
};

const fplPayload = {
  ok: true,
  gameweek: 3,
  prediction_run_id: 1256,
  model_version: '0.3',
  current_model_version: '0.3',
  generated_at: '2026-09-01T20:05:00+00:00',
  run_type: 'pre_deadline',
  squad: players,
  all_predictions: players,
  top_double_digit: players.slice(0, 10),
  fixture_results: fixtureResults,
};

const managerPlanPayload = {
  ok: true,
  gameweek: 3,
  available_gameweeks: [3],
  plan: {
    id: 3,
    gameweek: 3,
    captured_at: '2026-08-31T22:43:34+00:00',
    status: 'PROVISIONAL_HOLD_POST_GW2_PENDING_TRANSFER_DEADLINE_AND_PRESSERS',
    horizon: '3-5 GW',
    transfers: [],
    captain_player_id: 1,
    vice_player_id: 2,
    starting_xi: [8,9,10,11,1,2,3,4,5,6,7],
    bench_order: [12,13,14,15],
    chip: 'NONE',
    risk_level: 'MEDIUM',
    rationale: { decision: 'Hold and preserve both free transfers pending the final information gate.' },
    source: 'visual_fixture',
    supersedes_id: 2,
  },
  manager_state: {
    id: 1,
    gameweek: 3,
    captured_at: '2026-09-01T23:57:35+00:00',
    free_transfers: 2,
    bank_tenths: 0,
    acquisition_squad_cost_tenths: 1000,
    source: 'C0179_DERIVED_AUDITED_MANAGER_STATE_V1',
    evidence: { change_id: 'C0179' },
  },
};

const recent = (teamId: number) => Array.from({ length: 5 }, (_, index) => ({
  team_id: teamId,
  sequence_no: index + 1,
  opponent_team_id: 1000 + index,
  opponent_name: `Opponent ${index + 1}`,
  opponent_short: `O${index + 1}`,
  fixture_kickoff: `2026-08-${String(30 - index * 4).padStart(2, '0')}T14:00:00+00:00`,
  venue: index % 2 ? 'A' : 'H',
  goals_for: index % 3,
  goals_against: (index + 1) % 3,
  result: index % 3 === 0 ? 'W' : index % 3 === 1 ? 'D' : 'L',
}));

const factsPayload = {
  ok: true,
  gameweek: 3,
  facts_available: true,
  evidence_source: 'visual_fixture',
  snapshot_run: { id: 7, as_of_gameweek: 2 },
  fixtures: fixtureResults.map((fixture, index) => ({
    match_id: fixture.match_id,
    gameweek: 3,
    kickoff_time: fixture.kickoff_time,
    home: { id: 10 + index * 2, name: fixture.home_team, short_name: fixture.home_short, recent: recent(10 + index * 2) },
    away: { id: 11 + index * 2, name: fixture.away_team, short_name: fixture.away_short, recent: recent(11 + index * 2) },
    alignment_basis: { snapshot_id: fixture.prediction.snapshot_id, captured_at: fixture.prediction.captured_at, source_change_id: 'C0166', top_outcome: 'H', markets: fixture.prediction.markets },
    card_facts: [{ id: 1000 + index, snapshot_run_id: 7, match_id: fixture.match_id, team_id: 10 + index * 2, opponent_team_id: 11 + index * 2, fact_type: 'C0166_MATCHUP_XG', usefulness_score: .9, card_rank: 1, alignment: 'SUPPORTS', one_liner: `${fixture.home_team} have the stronger recent chance matchup.`, payload: { family: 'MATCHUP_XG' }, evidence_cutoff: '2026-09-01T20:32:50+00:00' }],
    modal_facts: [],
  })),
};

const bettingPayload = {
  ok: true,
  gameweek: 3,
  odds_status: 'unavailable',
  value_edge_available: false,
  research_edge_available: false,
  price_tracking_available: false,
  clv_research_available: false,
  warnings: [],
  fixtures: fixtureResults.map((fixture) => ({
    match_id: fixture.match_id,
    kickoff_time: fixture.kickoff_time,
    finished: false,
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    home_short: fixture.home_short,
    away_short: fixture.away_short,
    prediction: { snapshot_id: fixture.prediction.snapshot_id, source_change_id: 'C0166', markets: fixture.prediction.markets, top_scorelines: fixture.prediction.top_scorelines, captured_at: fixture.prediction.captured_at },
    bookmaker_odds: [],
    correct_score_odds: [],
    bookmaker_count: 0,
    bookmaker_source_count: 0,
    market_count: 0,
    edge_research: { status: 'NO_CURRENT_OBSERVATIONS', model_effect_enabled: false, observation_count: 0, robust_positive_ev_count: 0, top_robust_positive_ev: [] },
    price_tracking: null,
    clv_research: null,
  })),
};

const calibrationPayload = {
  ok: true,
  gameweek: 3,
  active_model: '0.3',
  active_generated_at: '2026-09-01T20:05:00Z',
  frozen_prediction_run_id: 1256,
  summary: { frozen_xi_xpts: 57.8, current_xi_xpts: 58.3, benchmark_xi_xpts: 56.9, benchmark_xi_matched: 11, matched_players: 15, mae: .42, bias: .08 },
  validation: {
    forward: {
      available: true,
      selected_ablation_key: 'A0005',
      coverage: {
        predictions: 140,
        evaluations: 70,
        cohort_fixtures: 20,
        splits: [
          { split: 'VALIDATION', gameweek: 2, fixtures: 10 },
          { split: 'TEST', gameweek: 3, fixtures: 10 },
        ],
      },
      integrity: { prediction_actual_data_violations: 0 },
      variants: [
        { variant_key: 'BASE_V03_ELO', split: 'VALIDATION', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .64794, avg_score_log_loss: 3.173, direction_accuracy: .5, exact_top_score_rate: .1, avg_process_mae: null, avg_gap_error: null },
        { variant_key: 'FULL_V04_ELO_NO_SCHEDULE', split: 'VALIDATION', total_predictions: 10, evaluated_fixtures: 10, pending_fixtures: 0, avg_brier: .62813, avg_score_log_loss: 3.1295, direction_accuracy: .6, exact_top_score_rate: .2, avg_process_mae: null, avg_gap_error: null },
        { variant_key: 'FULL_V04_ELO_NO_SCHEDULE', split: 'TEST', total_predictions: 10, evaluated_fixtures: 0, pending_fixtures: 10, avg_brier: null, avg_score_log_loss: null, direction_accuracy: null, exact_top_score_rate: null, avg_process_mae: null, avg_gap_error: null },
      ],
      latest_promotion_gate: null,
    },
    retrospective: [
      { gameweek: 1, evaluated_fixtures: 10, direction_accuracy: .6, exact_top_score_rate: .2, avg_brier: .63, avg_score_log_loss: 3.13 },
      { gameweek: 1, evaluated_fixtures: 10, direction_accuracy: .5, exact_top_score_rate: .1, avg_brier: .65, avg_score_log_loss: 3.20 },
    ],
  },
};

const enginePayload = {
  ok: true,
  gameweek: 3,
  generated_at: '2026-09-02T00:55:00Z',
  active_model: { id: 3, version: '0.3', description: 'Current model', config: {}, is_active: true, created_at: '2026-08-20T00:00:00Z' },
  latest_prediction_run: { id: 1256, gameweek: 3, generated_at: '2026-09-01T20:05:00Z', run_type: 'pre_deadline', frozen: false, excluded_from_backtest: false },
  production_fixture_layer: { fixtures: 10, latest_snapshot_id: 220, latest_captured_at: '2026-09-01T21:03:00Z', change_ids: ['C0166'] },
  governance: { ok: true, total_rows: 108, decision_rows: 50, bad_change_ids: 0, completed_not_verified: 0, completed_without_refs: 0, decision_rows_without_refs: 0 },
  decision_evidence_audit: { ok: true, fixtures_audited: 10, hard_violations: 0 },
  production_evidence_audit: { ok: true, fixtures_audited: 10, hard_violations: 0 },
  experiments: {
    A0005: { ok: true, decision_state: 'GW2_COMPLETE_REVIEW_ONLY_NO_TUNING', coverage: { fixtures: 20, evaluations: 70, predictions: 140 }, integrity: { run_violations: 0 } },
    W0002: { ok: true, decision_state: 'ACCUMULATING_GW4_VALIDATION', coverage: { fixtures: 20, evaluations: 0 }, integrity: { run_violations: 0 } },
  },
  source_health: {
    zero_cost: { change_id: 'C0139', sources: [{ source_key: 'fotmob_public', available: 6, blocked: 2, any_current_epl_scope: true, any_production_ready: false }], integrity_violations: { model_effect_enabled: 0 } },
    fotmob_metrics: { change_id: 'C0139', rows: 2138, usable_rows: 1069, integrity_violations: { model_effect_enabled: 0 } },
    physical_load: { change_id: 'C0140', rows: 20, latest_teams: 20, integrity_violations: { model_effect_enabled: 0 } },
  },
  semantics: { research_statuses_are_not_production_effects: true, missing_is_not_zero: true, immutable_historical_forecasts_preserved: true },
};

const routes = [
  ['home', 'Command Center'],
  ['fixtures', 'Fixtures'],
  ['fpl', 'FPL decision workspace'],
  ['markets', 'Markets'],
  ['performance', 'Performance'],
  ['engine', 'Engine & Research'],
] as const;

const crestSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#777"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-02T01:00:00Z'));
  await page.route('**/gameweek-status-api**', async (route) => route.fulfill({ json: gameweekStatusPayload }));
  await page.route('**/fpl-api**', async (route) => route.fulfill({ json: fplPayload }));
  await page.route('**/fpl-manager-plan-api**', async (route) => route.fulfill({ json: managerPlanPayload }));
  await page.route('**/fixture-facts-api**', async (route) => route.fulfill({ json: factsPayload }));
  await page.route('**/betting-api**', async (route) => route.fulfill({ json: bettingPayload }));
  await page.route('**/calibration-summary**', async (route) => route.fulfill({ json: calibrationPayload }));
  await page.route('**/engine-diagnostics-api**', async (route) => route.fulfill({ json: enginePayload }));
  await page.route('https://resources.premierleague.com/premierleague/badges/**', async (route) => route.fulfill({ contentType: 'image/svg+xml', body: crestSvg }));
});

test('C0182 deterministic visual baselines cover every v2 surface', async ({ page }, testInfo) => {
  const mismatches: string[] = [];
  for (const [view, heading] of routes) {
    await page.goto(`/?view=${view}&gw=3`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.evaluate(() => document.fonts.ready);
    const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const hash = createHash('sha256').update(screenshot).digest('hex');
    const key = `${testInfo.project.name}:${view}`;
    console.log(`C0182_VISUAL|${key}|${hash}`);
    const baseline = visualBaselines[key];
    if (!baseline) mismatches.push(`${key}: missing baseline (actual ${hash})`);
    else if (baseline !== hash) mismatches.push(`${key}: expected ${baseline}, actual ${hash}`);
  }
  expect(mismatches, `Visual regression mismatch:\n${mismatches.join('\n')}`).toEqual([]);
});
