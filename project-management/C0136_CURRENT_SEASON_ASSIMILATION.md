# C0136 — Adaptive current-season team-performance assimilation

Date: 2026-08-26
Status: Verified
Scope: rolling pre-deadline FPL projections only
Betting model effect: disabled

## Purpose

The opening weeks of a new season must not remain anchored almost entirely to the previous season. C0136 keeps 2025/26 team strength as a prior but lets completed 2026/27 competitive evidence gain weight quickly, while preventing one noisy scoreline from dominating the model.

This change does **not** alter W0001/A0005, E0007 or W0002. The frozen betting-validation cohorts remain unchanged.

## Source audit and production source hierarchy

Current production evidence uses multiple independent sources rather than relying on FotMob alone:

1. **Official FPL results** — authoritative result/player outcome lineage, including minutes, starts, goals, assists and official player xG/xA fields where available.
2. **Football-Data.co.uk 2026/27 E0** — 10/10 GW1 matches and 20/20 team-sides. Raw rows currently expose score, shots, shots on target, corners and HxG/AxG.
3. **Understat 2026/27 EPL** — xG for 17/20 current-team GW1 sides. Three promoted-team sides are unavailable rather than imputed.
4. **FPL-Core-Insights / FotMob-derived competitive core** — supplemental richer team/player events, including possession/pass accuracy when processed. At initial C0136 verification these fields covered 12/20 GW1 team-sides; missing values remain NULL.

Independent xG cross-check: on the 17 team-sides where Football-Data and Understat both had GW1 xG, correlation was 0.9790 and MAE 0.1828. C0136 averages the two sources when both are present rather than blindly privileging one.

Additional documented API candidates were audited for richer passing/territorial data:
- Sportmonks Football API;
- API-Football fixture statistics;
- official Premier League/Opta statistics as an authoritative reference.

No paid/API-key source was silently integrated. Production remains able to operate with the independent sources above; richer provider fields can be added later without treating their absence as zero.

## Current-season weighting policy

For retained Premier League teams:

`base_current_weight = min(0.85, n / (n + 3))`

For promoted teams / weak promoted baseline:

`base_current_weight = min(0.85, n / (n + 2))`

Therefore after GW1:
- retained teams: 25% base current-season weight;
- promoted teams: 33.3% base current-season weight.

The effective weight is reduced when process-data coverage is incomplete. This is intentionally faster than the previous player-state six-match / 450-minute-style shrinkage, but it still prevents one match from becoming the whole model.

Approximate retained-team progression:
- 1 match: 25%
- 2 matches: 40%
- 3 matches: 50%
- 5 matches: 62.5%
- 8 matches: 72.7%
- 10 matches: 76.9%
- asymptotic cap: 85%

## Process versus scoreline

The team update is explicitly process-led. Available evidence is combined with null-aware renormalization:

- xG / xGA: 50%
- shots: 15%
- shots on target: 10%
- big chances: 10%
- actual goals: 10% attacking / 15% defensive concession component
- possession + pass accuracy jointly: 5% attacking-control component when both exist

Passing accuracy is deliberately small and contextual. High completion from harmless circulation must not dominate attacking strength.

Every team-side is normalized against either its genuine pre-match expectation or its prior strength. Missing metrics are excluded from the relevant weighted mean, never replaced with zero.

The resulting process index is conservatively bounded and then shrunk by the effective current-season weight before affecting the rolling FPL fixture lambda.

## Chelsea–Fulham GW1 example

Chelsea beat Fulham 3–2. C0136 does not simply convert `3 goals = strong attack`.

For Chelsea the canonical GW1 process used approximately:
- goals: 3;
- blended independent-source xG: 2.142;
- shots: 18;
- shots on target: 6;
- possession/pass accuracy: unavailable in the currently processed Chelsea–Fulham supplemental row, therefore omitted rather than zero-filled.

With one completed match and 87.5% process coverage:
- base current-season weight: 25%;
- effective weight: ~21.9%;
- attack process index: 1.399;
- applied attack factor: 1.076;
- defensive-concession index: 1.162;
- applied defensive-concession factor: 1.033.

This moved Chelsea's prior xGF 1.592 to an assimilated process state of about 1.713, while prior xGA 1.263 moved to about 1.305. The conclusion is nuanced: Chelsea's attack was upgraded, but conceding two and the underlying defensive process prevented a blanket team upgrade.

## Player return confirmation

Current player-state already updates future minutes/start probability/xG90/xA90 from completed official competitive evidence. C0136 adds a deliberately small positive-only confirmation for actual goals and assists so a real return such as Palmer's GW1 goal + assist is not completely discarded.

The confirmation has a strong 15-event prior and is capped at +5% for goal hazard and +5% for assist hazard. It never applies a negative factor below 1.0, avoiding double-punishment when xG/xA process has already captured a missed chance.

GW1 examples:
- Palmer: goal factor 1.0471, assist factor 1.0500;
- João Pedro: goal factor 1.0237, assist factor 1.0500;
- Tzolis: assist factor 1.0500.

## GW2 effect

The pre-C0136 rolling snapshot was run 5:
- formation 3-5-2;
- XI xPts 49.428;
- captain Tzolis;
- vice Mbeumo.

After current-season team assimilation plus player-return confirmation, immutable GW2 run 9 was generated pre-deadline:
- 600 player predictions;
- formation 3-5-2;
- XI xPts 50.141;
- captain Tzolis;
- vice Mbeumo.

Selected active-squad xPts changes from run 5 to run 9:
- Mosquera +0.301;
- O'Reilly +0.228;
- Tzolis +0.139;
- João Pedro +0.053;
- Verbruggen +0.053;
- N. Williams +0.052;
- Semenyo +0.043;
- Palmer +0.030;
- Isak +0.003;
- Bruno Fernandes -0.022;
- Mbeumo -0.022;
- van Ewijk -0.074;
- Dalot -0.093.

Palmer does not receive a large hindsight-style boost merely because he scored 13 FPL points. Chelsea's improved attack and Palmer's real return push upward, while Brighton's strong GW1 defensive process pushes the GW2 matchup the other way. This is intended behavior.

## Automation

Hourly current-season refresh jobs are staggered:
- Understat: minute 07;
- Football-Data: minute 12;
- competitive-core source: minute 17;
- team-state rebuild: minute 25.

The existing upcoming-GW FPL scheduler runs every five minutes. C0136 teaches it to regenerate when new player/team evidence has appeared, even if the previous snapshot is less than four hours old. Every generated snapshot remains immutable.

## Verification

GW2 run 9:
- 600 predictions;
- 0 null core projection rows;
- 0 probability-tail ordering violations;
- 0 deadline chronology violations;
- 0 target-GW actual-data flag violations;
- frozen=true;
- excluded_from_backtest=false.

Current-season team state:
- 20 teams;
- one completed match each at initial verification;
- process coverage high, with passing/possession partial rather than fabricated.

Governance audit remains clean.

A0005 after C0136:
- 140 frozen predictions;
- 20 fixtures;
- 0 evaluations;
- 0 run/prediction/duplicate-evaluation integrity violations.

W0002 after C0136:
- 20 fixtures;
- 0 evaluations;
- 0 cohort/base/enriched/duplicate integrity violations.

## Production objects / migrations

- `public.current_season_team_performance_states`
- `public.current_season_team_performance_latest`
- `private.current_season_weight_v01`
- `private.refresh_current_season_team_performance_v01`
- `private.fpl_adjusted_team_lambda_v01`
- `private.fpl_projection_inputs_changed_since_v01`
- `private.current_season_team_performance_status_v01`
- `private.fpl_player_goal_confirmation_v01`
- `private.fpl_player_assist_confirmation_v01`

Supabase migrations:
- `20260825220805_c0136_adaptive_current_season_team_assimilation_v01`
- `20260825220829_c0136_current_season_weight_count_cast_fix`
- `20260825220912_c0136_digest_schema_fix`
- `20260825220952_c0136_preseason_prior_lineage_fix`
- `20260825221208_c0136_player_return_confirmation_v01`

## Decision

C0136 is accepted for the rolling FPL decision surface because it fixes a live early-season assimilation deficiency before the GW2 deadline, preserves immutable snapshots, uses only already-completed matches to update future decisions, and keeps the betting-validation cohorts unchanged.

This is **not** retrospective evidence for promoting a betting model. Current-season effects remain disabled for A0005/E0007/W0002 until their precommitted validation rules are satisfied.
