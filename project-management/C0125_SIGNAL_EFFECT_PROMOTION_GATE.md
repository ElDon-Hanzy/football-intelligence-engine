# C0125 — Signal-effect promotion gate v0.1

Date: 2026-08-25
Parent: C0073
Status: Completed / Verified

## Purpose
Prevent small retrospective effect-size wins from becoming active model effects without sufficient genuine forward evidence.

## Gate inputs
The gate combines:
1. the immutable historical family decision from E0009/C0124;
2. a named genuine forward ablation and candidate variant;
3. separate VALIDATION and TEST metrics;
4. chronology/model-effect integrity checks.

Current default forward source is A0005 / E0006. `RECENT_FORM_PACKAGE` maps to A0005 `FORM_ONLY`; families without an isolated forward variant are explicitly blocked rather than inferred from a mixed variant.

## Policy
- minimum VALIDATION observations: 50;
- minimum TEST observations: 30;
- candidate must improve Brier by at least 0.005 in both windows;
- score log loss must not worsen in either window;
- process MAE may not exceed baseline by more than 2%;
- no chronology/model-effect integrity violations;
- historical retrospective evidence can never satisfy the gate by itself;
- no automatic activation under any gate outcome.

A passing assessment is only `PASS_RESEARCH_PROMOTION_REVIEW`; it still requires manual review and a separate activation change.

## Current assessments
- RECENT_FORM_PACKAGE → `NOT_ENOUGH_FORWARD_SAMPLE` (A0005 FORM_ONLY; 0 evaluated forward fixtures at implementation time)
- OPPONENT_DEFENCE_TREND → `NO_FORWARD_ISOLATION_VARIANT`
- OWN_ATTACK_FORM → `HISTORICAL_NOT_ELIGIBLE`
- REGULARIZED_MAIN_EFFECTS → `HISTORICAL_NOT_ELIGIBLE`
- SCHEDULE_FATIGUE → `HISTORICAL_NOT_ELIGIBLE`

## Production controls
- `signal_effect_promotion_assessments` is append-only;
- `private.assess_signal_effect_promotion_v01()` creates idempotent metric/state snapshots;
- `private.signal_effect_promotion_gate_status_v01()` reports latest family assessments;
- negative mutation test passed;
- A0005 and W0002 remained unchanged and integrity-clean.

The first deployed gate version exposed an uninitialized-record bug for families without an isolated forward variant. The follow-up migration `c0125_signal_effect_promotion_gate_record_fix` corrected that path; no invalid assessment rows were retained.
