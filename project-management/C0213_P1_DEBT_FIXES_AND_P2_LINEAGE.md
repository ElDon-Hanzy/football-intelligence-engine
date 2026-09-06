# C0213 — P1 debt fixes and P2 orchestration/readiness lineage

## Scope

This work follows the C0213 architecture registry audit. It fixes the four material architecture debts exposed by P1 and starts P2. It does not rewrite frozen historical forecasts, promote research models, or create a GW4 manager decision.

## Four material debts fixed

### 1. Canonical full-pool £100m optimizer

Deployed `fpl-full-pool-optimizer` (runtime v3), registered as the canonical `FPL_FULL_POOL_OPTIMIZER` production capability.

Properties:
- read-only; `decisioning=false`, `writes_manager_plan=false`;
- uses the full projectable pool before filtering;
- top-300 expected-minutes pool plus explosive-exception bucket;
- position-specific candidate pools;
- legal 15-player FPL squad constraints: 2 GKP, 5 DEF, 5 MID, 3 FWD, max 3 per club, budget cap;
- horizon 1–5 supported, but P2 decision readiness requires 3–5;
- includes bench leakage, captain multiplier, optional transfer-cost/free-transfer penalty;
- deterministic multistart local search, explicitly `search_exact=false`;
- fails closed on missing horizon projections.

Behavioral probe request 3025 returned HTTP 200 over 604 projectable players, 300 xMins candidates plus 97 explosive exceptions. The best-vs-second objective gap was 0.108 points against a 1-point model-error margin, correctly classified `NO_MEANINGFUL_EDGE_WITHIN_MODEL_ERROR`. This was an engineering horizon-1 probe, not an FPL recommendation.

### 2. Duplicate competitive-core cron

Removed obsolete `football_intelligence_competitive_core_ingest`. The only active schedule invoking `ingest-competitive-core-stats` is now cron 16 (`football_intelligence_c0136_competitive_core`, hourly at :17).

### 3. Tactical canonical selector

`public.current_fixture_tactical_matchups` now deterministically prioritizes `fixture_tactical_matchup_v0.1.1` over base v0.1 for the same match/team/signal. GW4 live proof: 100/100 current tactical rows are calibrated v0.1.1.

### 4. Fail-closed decision readiness

Added `private.c0213_decision_readiness_v01(gameweek)`, combining C0166 production-evidence and C0167 decision-evidence gates.

A BEFORE INSERT trigger on `public.decision_snapshots` now blocks valid rolling/deadline automated decision inserts when readiness is false, while allowing projection generation to continue. A behavioral probe returned zero inserted rows and wrote `DECISION_READINESS_BLOCKED` to `private.c0213_decision_write_blocks`.

`private.generate_upcoming_fpl_snapshot_v01()` now reports `decision_saved`, `decision_status`, and `decision_readiness` separately from projection coverage/status.

## P2 started — orchestration/readiness lineage

P2 introduces an append-only, stage-by-stage lineage contract that separates:
- data timestamp;
- orchestration execution timestamp;
- stage existence;
- projection readiness;
- decision readiness;
- output existence.

This distinction is important because a successful state refresh may produce no new row when inputs are unchanged. For example, current-season team-state data had an older `as_of`, while cron 17 had in fact run successfully at 23:25 UTC.

### P2 objects

- `private.c0213_p2_lineage_snapshots` — append-only lineage snapshots.
- `private.c0213_p2_latest_cron_runs_v01` — latest execution evidence for each active cron.
- `public.fpl_full_pool_optimizer_runs` — append-only optimizer run metadata; never a manager-plan decision.
- `private.capture_c0213_optimizer_response_v01(request_id)` — captures successful optimizer response metadata.
- `private.c0213_p2_current_lineage_v02(gameweek)` — canonical current lineage/readiness contract.
- `private.capture_c0213_p2_lineage_v01(gameweek)` — append-only lineage capture.

### P2 stages

1. RESULTS
2. FPL_CURRENT_DATA
3. REALIZED_ROLES
4. PLAYER_STATE
5. TEAM_STATE
6. TACTICAL_FIXTURE_STATE
7. FIXTURE_PROJECTION
8. PLAYER_PROJECTION
9. POINT_DISTRIBUTION
10. FULL_POOL_OPTIMIZER
11. DECISION_READINESS
12. AUTOMATED_CURRENT15_DECISION
13. SAVED_MANAGER_PLAN

### First persisted P2 snapshot

GW4 lineage snapshot id: 1.

Result:
- `projection_ready=true`
- `decision_ready=false`
- latest player projection run: 1295
- projectable players: 604
- governed exclusions: 49
- ungoverned missing: 0
- point-distribution rows: 604/604
- tactical rows: 100/100 calibrated v0.1.1
- fixture predictions: 10/10
- full-pool optimizer: `ENGINEERING_ONLY_HORIZON` because the only stored probe used horizon 1
- automated decision for the latest projection run: `BLOCKED_EXPECTED`
- saved manager plan: `NOT_YET_ALLOWED`

Current blockers are exactly:
1. `PRIOR_GAMEWEEK_NOT_FINAL` — GW3 is still incomplete.
2. `OPTIMIZER_HORIZON_LT_3` — engineering probe is not a valid 3–5 GW decision run.
3. `C0166_C0167_NOT_READY` — post-GW3 evidence/fact-card readiness is still red.

The first v01 lineage probe exposed a counting bug because it counted starter rows across every repeated GW3 result capture. Before persistence, v02 corrected this to the latest result run only: 176 current starters, 166 mapped realized-role players (94.32%) while GW3 is unfinished. The realized-role stage therefore correctly reports `WAITING_FOR_FINAL_RESULTS` rather than pretending to be complete.

## Guardrails preserved

- No frozen historical forecast rewritten.
- Missing data is not zero.
- No research model promoted.
- No GW4 manager plan written.
- The optimizer result cannot itself authorize a decision.
- P2 requires a current 3–5 GW optimizer run plus final prior-GW results, realized-role completion, projection readiness and C0166/C0167 evidence readiness before `decision_ready=true`.

## Remaining C0213 work

P2 is started but not complete. Next work should automate/canonicalize optimizer invocation + capture after the required horizon projections exist, expose projection vs decision readiness through diagnostics/API/UI, and harden the saved-manager-plan write boundary against the P2 decision-readiness contract. Later consolidation phases still need to retire/deploy-clean the 19 architecturally retired Edge Functions and complete the canonical architecture documentation.