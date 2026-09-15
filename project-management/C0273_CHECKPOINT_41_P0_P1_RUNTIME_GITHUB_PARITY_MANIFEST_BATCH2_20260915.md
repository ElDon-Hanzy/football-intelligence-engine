# C0273 — Checkpoint 41: P0/P1 Runtime↔GitHub Parity Manifest — Batch 2

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Status: PLANNING / READ-ONLY FORENSIC AUDIT
Production runtime/model effect: NONE

## Authorization boundary
This checkpoint continues the user-authorized P0/P1 parity investigation as planning/documentation only. No source recovery, deployment/redeployment, schema/cron/API/UI/model behavior change, promotion/retirement, publication, or FPL-account action is authorized by this checkpoint.

## 1. Continuity recheck
Checkpoint 40 established the initial P0/P1 manifest and identified `fpl-full-pool-optimizer` as a third material runtime-ahead artifact after the CP39 recoveries. The live C0273 tracker remains Open / Planned / P0 / Pre-VPS Stabilization Planning with model_effect=None. The tracker implementation_refs still stop at CP39, so CP40/CP41 durable GitHub docs should be appended in a future tracker-documentation update; this is governance/documentation drift, not runtime drift.

## 2. Batch-2 source parity observations
The following comparisons are bounded source inspections, not cryptographic normalized release proofs.

### A. fpl-manager-plan-api v8 — MATCH OBSERVED
Live and GitHub main share the same source opening and serving contract. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Semantic contradiction remains open: the API labels `current_fpl_live_plan_v01` as `live_plan_is_best_current_fully_evaluated_plan=true`, although prior C0273 work proved that view is latest captured publication rather than a generation-valid canonical authority pointer. Source parity therefore preserves an existing truthfulness defect; it does not resolve it.

### B. gameweek-status-api v8 — MATCH OBSERVED
Live and GitHub main share the same public-client auth constants and source opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

This API resolves live Gameweek from fixture schedule/finished state and keeps frozen projection navigation separate. No new source mismatch was observed in this bounded comparison.

### C. fpl-v3-workspace-api v3 — MATCH OBSERVED
Live and GitHub main share the same source opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Two previously identified semantic defects are reconfirmed in live source:
1. deadline fallback remains `first kickoff - 90m` when the prediction run lacks deadline_at, so official deadline authority is not guaranteed;
2. player actuals are labelled `FINAL` when their fixture IDs are contained in the finished-fixture snapshot, which is fixture-completion finality rather than official FPL scoring settlement finality.

The API also resolves default Gameweek from latest `current_fpl_live_plan_v01`, inheriting the non-canonical-current-publication concern.

### D. fpl-v3-actual-live-api v2 — MATCH OBSERVED
Live and GitHub main share the same source opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Semantic defect reconfirmed: scenario player status becomes `FINAL` when all relevant fixture phases are FINISHED and `points_are_final=true` when a result row exists. This overstates official FPL settlement finality. The API correctly refuses to infer actual submitted squad from engine recommendation and requires a full 11+4 actual snapshot.

### E. fpl-full-pool-optimizer-core-v02 v1 — EXACT WRAPPER IDENTITY OBSERVED
Live source is a one-line import pinned to GitHub commit `43826b99eb6eaa9ac0cc044a541ea706eff46b0a` at the historical monolithic optimizer path. GitHub main contains the same one-line pinned import. Disposition: `MATCH_OBSERVED_PINNED_CORE`.

This materially clarifies CP40: production optimizer architecture is intentionally split into:
- live `fpl-full-pool-optimizer` v15 = role-safe/manager-FT adapter;
- live `fpl-full-pool-optimizer-core-v02` v1 = immutable wrapper pinned to historical optimizer source commit 43826b99...

Therefore recovering the v15 adapter into GitHub will not overwrite or reinterpret the pinned core. The current GitHub canonical `fpl-full-pool-optimizer` path is nevertheless unsafe for disaster recovery because it contains the historical core rather than the deployed adapter.

### F. refresh-forward-fixture-forecasts v1 — MATCH OBSERVED
Live and GitHub main share the same implementation opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### G. refresh-forward-enriched-predictions v2 — MATCH OBSERVED
Live and GitHub main share the same implementation opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

This function remains explicitly research-only/model_effect_enabled=false in live behavior, so parity is relevant to reproducibility but lower authority risk than the optimizer/gate/publication chain.

## 3. Red-team: source layout hazard discovered
The optimizer split exposes a repository-layout hazard that is distinct from simple runtime drift.

Historical core code still occupies the canonical GitHub path `supabase/functions/fpl-full-pool-optimizer/index.ts`, while production uses that slug for a newer adapter. The separate core runtime imports the historical code by immutable commit SHA, so production works, but a developer rebuilding/deploying the slug from current GitHub main could silently replace the adapter with the old core.

Target recovery contract must therefore preserve both identities explicitly:
- canonical current slug source = deployed adapter;
- historical core = immutable pinned source/reference retained for reproducibility;
- deployment manifests must state slug -> source identity -> expected runtime version/bundle hash.

Do not "simplify" by changing the pinned core import or by repointing the core to GitHub main. That would convert a reproducible historical core into a moving dependency.

## 4. Consolidated status after Batch 2
Confirmed material runtime-ahead/recovery items so far:
1. `refresh-current-player-state` — recovered CP39; equivalence proof still pending.
2. `fpl-sequential-planner` — recovered CP39; equivalence proof still pending.
3. `fpl-full-pool-optimizer` v15 adapter — runtime-ahead, NOT recovered in this planning-only batch.

Observed source matches now include:
- sync-fpl-data
- refresh-availability-intelligence
- sync-gw-results
- sync-fpl-manager-state
- sync-fpl-actual-decision
- fpl-autonomous-gate
- fpl-manager-plan-api
- gameweek-status-api
- fpl-v3-workspace-api
- fpl-v3-actual-live-api
- fpl-full-pool-optimizer-core-v02
- refresh-forward-fixture-forecasts
- refresh-forward-enriched-predictions

These remain `MATCH_OBSERVED`, not release-grade exact parity, until normalized multi-file/source/config manifests are generated.

## 5. Open contradictions preserved for user review
- Source parity does not fix official deadline authority split.
- Source parity does not fix fixture-complete vs official FPL settlement finality.
- Source parity does not create canonical generation-valid publication authority.
- Source parity does not solve hidden/private pre-deadline manager-state observability.
- V3 and manager-plan APIs can truthfully reproduce deployed code while still overclaiming `FINAL` or `best current` semantics.
- Tracker implementation_refs lag CP40/CP41 documentation.
- Optimizer canonical GitHub path currently represents historical core while production slug represents adapter; recovery layout must be explicit.

## 6. Next bounded P0/P1 batch
Inspect direct C0248/C0234 authority dependencies and publication path:
- fpl-squad-ensemble
- fpl-structural-control
- fpl-forward-management
- fpl-or-utility
- fpl-red-team
- fpl-final-adversarial
- fpl-transfer-path-evaluator
- fpl-decision-control / consistency bridges where Edge source exists
- C0237 publication-facing Edge/API components as applicable.

Then issue a consolidated release-recovery disposition matrix separating:
`EXACT/PINNED_MATCH`, `MATCH_OBSERVED`, `RECOVERED_PENDING_EQUIVALENCE`, `RUNTIME_AHEAD_RECOVERABLE`, `REPOSITORY_AHEAD`, `DIVERGENT`, `RUNTIME_ONLY`, and `SEMANTICALLY_WRONG_BUT_SOURCE_MATCHED`.

## Decision
P0/P1 Batch 2 found no additional runtime-ahead artifact among the seven newly inspected functions, but materially clarified the optimizer architecture and discovered a disaster-recovery source-layout hazard. The v15 adapter remains the only newly confirmed unrecovered P0 source mismatch at this point. No production behavior changed.

**All source recovery, deployment/redeployment, runtime/model/schema/cron/API/UI changes, promotion/retirement and FPL-account actions remain explicitly approval-gated.**