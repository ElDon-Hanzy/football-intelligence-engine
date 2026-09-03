# C0197 — Free-source evidence layer and historical coverage proof

Date: 2026-09-03
Status: In Progress / Executing
Model effect: None

## Scope

This phase implements only the chronology/provenance and research-evidence foundation for C0197. It does **not** change the production score model, Poisson selector, FPL projections, A0005, W0002, C0198 or C0176.

The user approved the zero-subscription source architecture in `C0197_FREE_SOURCE_PLAN_20260903.md`.

## Source

Primary advanced research source: `olbauday/FPL-Core-Insights` public GitHub data.

Operational safeguards:

- every file capture is pinned to a concrete upstream Git commit;
- source path, source URL, commit SHA/time, requested source-as-of, payload SHA-256 and row count are retained;
- research evidence is append-only;
- RLS is enabled and direct public/anon/authenticated grants are revoked;
- `research_only=true` and `model_effect_enabled=false` are database-enforced;
- missing values remain NULL;
- historical source-native `team_code` and stable `player_code` are retained, so relegated clubs and historical-only players are not dropped merely because they are absent from current tables.

## Production objects

Tables:

- `public.research_c0197_source_file_captures`
- `public.research_c0197_team_match_evidence`
- `public.research_c0197_player_match_evidence`
- `public.research_c0197_shot_events`

Private diagnostics:

- `private.c0197_free_source_status_v01()`
- `private.c0197_shot_side_quality_v01`
- `private.c0197_shot_reconciliation_status_v01()`
- `private.invoke_c0197_free_source_evidence_v01(...)`
- `private.invoke_c0197_historical_free_source_v01(...)`

Edge Functions:

- `ingest-c0197-free-source-evidence`
- `ingest-c0197-historical-free-source-evidence`

## Chronology proof

The current-season function resolves the latest upstream repository commit at or before the requested `as_of`, then fetches raw files at that SHA rather than mutable `main`.

GW1 was deliberately captured with `as_of=2026-08-28 18:59:00+00`, one minute before the first GW2 kickoff. It resolved upstream commit:

`0a199440cfdbbe96e6ea941d1bc885fe6b6a95a4`

The later GW2 current capture resolved:

`8b8351bec5fede578ee18031aa4116ee2aab9f19`

This proves historical current-season captures can be source-version-pinned to the evidence state existing before a later Gameweek cutoff.

A repeated GW2 capture at the same upstream commit inserted 0 team, player and shot rows, validating content-hash idempotency.

## Historical field audit

### 2024/25

Repository layout is older and has no shot-event directory, but match and player-match files are already rich.

Full ingested EPL coverage:

- 380 unique matches / 760 team sides;
- 11,567 player-match rows;
- 562 stable player codes;
- team xG: 760/760;
- team SOT: 760/760;
- team xGOT: 760/760;
- team Big Chances: 760/760;
- team Big Chances Missed: 760/760;
- player minutes/xG/SOT/xGOT/BCM/penalty fields are populated in the source schema and retained;
- no shot-event feed exists for this season, so it is **not** used to train the shot-level eSOT model.

### 2025/26

Full ingested EPL coverage:

- 380 unique matches / 760 team sides;
- 12,754 player-match rows;
- 565 stable player codes;
- team xG/SOT/xGOT/Big Chances/BCM: 760/760 for every field;
- 9,504 shot events across all 380 matches;
- 9,504/9,504 shots have xG;
- 3,078 shots have xGOT, as expected for post-shot/on-target subsets;
- all 9,504 historical shot rows map to stable source player codes;
- player BCM is present on 12,461/12,754 rows; missing values are retained as missing, not zero;
- goalkeeper post-shot evidence is present where supplied.

### 2026/27 current season

GW1-GW2 research captures currently contain:

- 20 matches / 40 team sides;
- 800 player-match rows;
- 550 shot events.

Current player-level BCM remains blank in the source rows captured so far even though team BCM is populated. C0197 must therefore use chronology-safe historical player BCM priors until genuinely observed current player BCM becomes available. Blank current BCM is never converted to zero.

## Shot-map reconciliation gate

Shot outcomes `goal` + `save` are compared with aggregate SOT, and shot-event counts are compared with aggregate total shots. The gate does not impose arbitrary xG/xGOT tolerances; those differences are retained only as diagnostics.

### 2025/26

- team sides: 760;
- exact total-shot reconciliation: 758/760;
- exact SOT reconciliation: 755/760;
- exact both: 754/760 = **99.2%**;
- eSOT-eligible sides: 754/760;
- mean absolute shot-map vs aggregate xG difference: 0.0636;
- median: 0.0124;
- p90: 0.1935;
- mean absolute xGOT difference: 0.0574;
- median: 0.0041;
- p90: 0.2036.

Six team sides are quarantined as `REVIEW`; no cause is invented without source proof.

### 2026/27 GW1-GW2

- team sides: 40;
- exact/eSOT-eligible: 34/40;
- current shot-map evidence is therefore visibly noisier than the mature 2025/26 history.

This current-season evidence cannot dominate the mature historical eSOT base merely because it is newer.

## Historical identity correction

The first historical test exposed a database upsert-contract issue: PostgREST could not target a partial unique index for `(source_file_capture_id, source_match_id, source_team_code)`.

No evidence rows were corrupted. The index was replaced with a normal nullable unique constraint, after which both 2024/25 and 2025/26 test ingestions passed. The correction is preserved as a separate migration rather than hidden.

## Model-use gates from this phase

1. **Football Chaos / scorer concentration** may use 2024/25 + 2025/26 rich match/player evidence, with chronology-safe rolling features only.
2. **Shot-level eSOT** training begins in 2025/26 because 2024/25 has no shot-event file.
3. eSOT training uses only `private.c0197_shot_side_quality_v01.esot_training_eligible=true` sides.
4. xGOT is post-shot evidence and must never be an input to the pre-shot eSOT probability model.
5. Current 2026/27 player BCM missingness falls back to historical priors with explicit age/coverage metadata; missing is not zero.
6. No C0197 feature has production model effect yet.

## Safety verification

- A0005: integrity violations 0; frozen prediction/evaluation state unchanged.
- W0002: integrity violations 0; `model_effect_enabled=false` preserved.
- Supabase security advisor produced no new C0197 warning beyond the intentional RLS-enabled/no-policy state used together with revoked table grants.

## Next phase

Build the first research-only eSOT benchmark with chronology-safe walk-forward evaluation. Compare a simple xG-only baseline against richer pre-shot context. Only retain extra complexity if it improves out-of-sample Brier/log-loss and team-side SOT calibration robustly; otherwise keep the simpler model.
