# C0273 — Checkpoint 42: P0/P1 Authority-Dependency Runtime↔GitHub Parity — Batch 3

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Status: PLANNING / READ-ONLY FORENSIC AUDIT
Production runtime/model effect: NONE

## Authorization boundary
This checkpoint continues C0273 as planning/documentation only. It does not recover source, deploy/redeploy, change schema/cron/API/UI/model/runtime behavior, execute planner/publication, promote/retire anything, or act on the FPL account. All production changes remain approval-gated.

## 1. Continuity
CP41 left one confirmed unrecovered runtime-ahead P0 artifact: `fpl-full-pool-optimizer` v15 adapter. CP39 recovered `refresh-current-player-state` v8 and `fpl-sequential-planner` v6 into GitHub, but release-equivalence proof remains pending.

## 2. Live authority dependency inventory correction
The CP41 next-batch list used the conceptual label `fpl-squad-ensemble`; no deployed Edge Function exists under that slug. The deployed implementation is `fpl-autonomy-ensemble` v2 (`C0228_ENSEMBLE_AGGREGATOR_V02_SEQUENTIAL`). This naming mismatch is documentation vocabulary drift, not runtime absence.

## 3. Batch-3 source parity observations
These are bounded source/version-marker comparisons, not normalized cryptographic release proofs.

### A. fpl-autonomy-ensemble v2 — MATCH OBSERVED
Live source begins `C0228_ENSEMBLE_AGGREGATOR_V02_SEQUENTIAL` and GitHub main exposes the same implementation marker/opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Important dependency contradiction: the ensemble hard-checks returned `optimizer_version` against `C0228_DISTRIBUTED_ENSEMBLE_OPTIMIZER_V02`, while the live slug `fpl-full-pool-optimizer` is now a C0240 role-safe adapter that delegates to the historical core and annotates results. This can be valid because the adapter preserves the core optimizer_version in its response, but it means version identity is layered: runtime component version != returned core optimizer_version. Release manifests must represent both adapter and core identity.

### B. fpl-structural-control v1 — MATCH OBSERVED
Live and GitHub main share `C0229_STRUCTURAL_CONTROL_V01`. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### C. fpl-forward-management v1 — MATCH OBSERVED
Live and GitHub main share `C0231_FORWARD_MANAGEMENT_V01`. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### D. fpl-or-utility v1 — MATCH OBSERVED
Live and GitHub main share `C0232_ENSEMBLE_OR_UTILITY_V01`. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### E. fpl-red-team v1 — MATCH OBSERVED
Live and GitHub main share `C0233_ADVERSARIAL_RED_TEAM_V01`. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### F. fpl-transfer-path-evaluator v1 — MATCH OBSERVED
Live and GitHub main share `C0240_TRANSFER_PATH_EVALUATOR_V01`. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### G. fpl-decision-control v2 — MATCH OBSERVED
Live and GitHub main share `C0225_RANK_AWARE_LEVERAGE_V01`. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

No additional runtime-ahead source artifact was found among these seven direct authority/support dependencies.

## 4. Red-team findings

### 4.1 Source parity still does not prove coherent release identity
The live authority chain composes components whose public semantic version fields may describe an inner/core model rather than the deployed wrapper. The optimizer adapter is the clearest example. A future release manifest must record at least:
- deployed slug;
- deployed Edge version;
- deployed bundle SHA;
- source commit/blob identity;
- wrapper/adapter semantic version;
- delegated core semantic version/source identity;
- authority effect class.

A single `optimizer_version` string is insufficient disaster-recovery evidence.

### 4.2 Conceptual names must not be treated as deployable identities
`fpl-squad-ensemble` was a conceptual planning name; deployed slug is `fpl-autonomy-ensemble`. Future runbooks/manifests must distinguish architecture capability names from exact runtime slugs to avoid false missing-component alarms or wrong deployment targets.

### 4.3 Matching supporting layers can still inherit stale inputs
Structural control, forward management, OR utility, red-team and decision-control generally select latest persisted upstream runs by GW/horizon. Source parity does not solve CP32–36 semantic-generation/freshness concerns. A perfectly reproduced function can still consume chronologically latest but semantically stale/misaligned evidence.

### 4.4 C0233 red-team is not the complete C0240 final adversarial contract
No deployed Edge slug named `fpl-final-adversarial` appears in the current live Edge inventory. C0240 final adversarial behavior may therefore live in SQL/private functions, planner orchestration, or other persisted controls rather than a same-named Edge Function. Do not infer its absence from the Edge inventory; it requires a separate SQL/control-plane trace.

## 5. Consolidated runtime-source status after Batch 3

### RECOVERED_PENDING_EQUIVALENCE
- refresh-current-player-state v8 — CP39 source recovery
- fpl-sequential-planner v6 — CP39 source recovery

### RUNTIME_AHEAD_RECOVERABLE
- fpl-full-pool-optimizer v15 adapter — still unrecovered under the planning-only authorization boundary

### MATCH_OBSERVED / PINNED_MATCH
Previously observed plus this batch:
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
- fpl-full-pool-optimizer-core-v02 (pinned historical core wrapper)
- refresh-forward-fixture-forecasts
- refresh-forward-enriched-predictions
- fpl-autonomy-ensemble
- fpl-structural-control
- fpl-forward-management
- fpl-or-utility
- fpl-red-team
- fpl-transfer-path-evaluator
- fpl-decision-control

No `REPOSITORY_AHEAD`, `RUNTIME_ONLY`, or independently competing source divergence has yet been confirmed in the inspected P0/P1 set, aside from the known optimizer adapter runtime-ahead state and the two CP39 recoveries.

## 6. Open contradictions preserved
- official FPL deadline authority split remains unresolved;
- fixture completion still differs from official FPL scoring settlement;
- canonical generation-valid current publication authority remains unresolved;
- hidden/private pre-deadline manager-state authority remains unresolved;
- semantic generation/material-drift policy is not yet frozen;
- realized-role semantic identity/tolerances remain partly unresolved;
- C0213 full-pool optimizer hard-readiness dependency vs C0248 canonical planner remains unresolved;
- C0240 final adversarial/control path still requires SQL/control-plane trace;
- tracker implementation_refs lag recent CP40–42 docs;
- exact normalized source/config parity has not yet been cryptographically established;
- recovered CP39 components still need release-equivalence evidence;
- v15 optimizer adapter still needs source recovery only after explicit approval.

## 7. Next bounded batch
Before any source recovery or VPS work, trace the non-Edge authority/control plane for C0240/C0234/C0237 and produce the consolidated release-recovery disposition matrix. Specifically inspect:
1. private/public SQL functions/views used for final adversarial testing, planner promotion/selection, autonomous gate and publication;
2. exact C0248 -> C0240 -> C0234 -> C0237 lineage and authority identifiers;
3. whether any SQL definitions are migration/source-controlled or live-only;
4. release-recovery requirements for database functions/views/triggers, not only Edge Functions;
5. tracker/documentation linkage through the latest checkpoint.

## Decision
Batch 3 found no new Edge source mismatch among seven direct authority/support dependencies, but exposed two recovery-contract requirements: layered adapter/core identity and exact runtime-slug naming. The only confirmed unrecovered Edge P0 mismatch remains `fpl-full-pool-optimizer` v15. The next risk surface is the SQL/control-plane authority chain.

**No production behavior changed. All source recovery, deployment/redeployment, runtime/model/schema/cron/API/UI changes, promotions/retirements, publication and FPL-account actions remain explicitly approval-gated.**