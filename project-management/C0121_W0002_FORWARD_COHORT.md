# C0121 — Rolling GW4/GW5 forward cohort

Status: Completed / Verified
Date: 2026-08-25

## Purpose
Freeze a second genuine forward cohort before any GW2 outcome is known, without modifying W0001/A0005.

## Production lineage
- Experiment: E0008 — GW4/GW5 rolling forward cohort v0.2
- Walk-forward run: W0002 (run_id=2)
- GW4: VALIDATION, 10 fixtures
- GW5: TEST, 10 fixtures
- Supabase migration: 20260825030714_c0121_w0002_forward_readiness

## Pre-kickoff chain created
For both GW4 and GW5:
- 610 availability / Expected-XI player observations
- 610 fixture role observations
- 20 team fixture tactical observations
- 232 replacement-quality observations
- 100 v0.1 + 100 v0.1.1 tactical matchup observations
- 20 canonical fixture-team feature snapshots
- 10 structural forward_fixture_v0.1.3 forecasts
- 10 team_strength_linear_v0.3_elo research candidates
- 10 forward_enriched_v0.2_form_decay predictions

All are pre-kickoff, forward-valid where applicable, actual_data_used=false, model_effect_enabled=false.

## W0002 guards and automation
Production functions:
- private.capture_w0002_near_close_v01()
- private.evaluate_w0002_forward_v01()
- private.w0002_forward_validation_status_v01()

Cron jobs:
- football_intelligence_w0002_near_close — every 5 minutes; DB guard only acts 5–20 minutes before kickoff
- football_intelligence_w0002_evaluator — :10/:25/:40/:55 hourly, after result-sync cadence

Near-close policy uses Bet365 + Unibet, does not reconstruct missed prices, and leaves unavailable CLV null.

## Verification
Initial W0002 status:
- 20 complete fixtures
- 0 finished fixtures
- 0 evaluations
- 0 near-close captures yet
- run violations: 0
- cohort violations: 0
- base prediction violations: 0
- enriched prediction violations: 0
- duplicate evaluation matches: 0
- decision state: ACCUMULATING_GW4_VALIDATION

Pre-result evaluator test inserted 0 evaluations and reported 20 pending fixtures. Near-close trigger correctly no-op'd outside the capture window.

A0005 integrity was rechecked after C0121 and remains 140 frozen predictions / 20 fixtures / 0 evaluations / 0 integrity violations.

## Integrity rule
W0002 is a separate second forward cohort. GW2/GW3 outcomes must not be used to retune W0002 after this freeze. Any materially changed model requires a new Change ID / experiment lineage.
