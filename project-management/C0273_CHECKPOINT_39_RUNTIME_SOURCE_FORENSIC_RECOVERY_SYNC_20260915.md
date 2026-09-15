# C0273 — Checkpoint 39: Runtime Source Forensic Recovery & Sync

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: APPROVED SOURCE-RECOVERY ACTION / NO PRODUCTION DEPLOYMENT  
Production runtime/model effect: NONE

## Authorization

Following Checkpoint 38, the user explicitly approved: **“Agree.. lets investigate and sync.”**

This checkpoint interprets that approval narrowly as authorization to recover the two already-confirmed runtime-ahead active Edge sources into canonical GitHub source control. It does **not** authorize Supabase deployment/redeployment, model changes, schema/cron changes, planner execution, promotion/retirement, publication, or FPL account execution.

## 1. Live artifact identities re-frozen before recovery

### refresh-current-player-state
- active Edge version: 8
- deployment bundle SHA-256: `9d475ca909aebf3a50fe44edf563d579f932d556352879af76864bc1ca298753`
- verify_jwt: false (existing deployed contract; unchanged)
- deployed semantic refresh marker: `0.4_xmins_regime_symmetric`
- deployed import map: `supabase -> npm:@supabase/supabase-js@2.112.3`

The deployed source was retrieved read-only immediately before recovery. GitHub `main` still contained the older `0.2_realized_role` implementation. The existing GitHub `deno.json` already matched the deployed import map exactly, so no dependency-file change was required.

### fpl-sequential-planner
- active Edge version: 6
- deployment bundle SHA-256: `e6387be4c603b5f47a8fa8b1368a218197c46a1f0c96c2774d1190ac6d9d2055`
- verify_jwt: false (existing deployed contract; unchanged)
- deployed planner marker: `C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE`

The deployed source was retrieved read-only immediately before recovery. GitHub `main` still contained `C0248_SEQUENTIAL_PLANNER_V04_WILDCARD_ROOT`.

## 2. Source-control recovery performed

The active deployed source text was copied into the corresponding canonical GitHub paths on `main` without invoking any deployment action.

Recovered paths:
- `supabase/functions/refresh-current-player-state/index.ts`
- `supabase/functions/fpl-sequential-planner/index.ts`

Git commits:
- player-state recovery: `fc93e541408e6152421b8d49e1695b867167ecb6`
- C0248 planner recovery: `cf8e7e41318830060fba6e2f64b1471f85167252`

Post-write GitHub reads confirm `main` now exposes:
- `refresh_version:'0.4_xmins_regime_symmetric'` and the deployed symmetric xMins-regime logic;
- `VERSION='C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE'`.

This is a **source recovery**, not a deployment. Supabase active versions and production behavior were not changed.

## 3. Historical provenance rule

The old Git history was not rewritten. The recovery is represented as new explicit commits dated after discovery of the mismatch. Therefore GitHub history remains honest: repository source lagged the active runtime, then the active runtime source was recovered after C0273 identified the drift.

The commits should not be interpreted as evidence that these runtime versions were originally created by those commits. Their provenance is:

`active Supabase runtime artifact -> C0273 forensic recovery -> explicit Git commit`

The original deployment-authorizing commit/change remains unresolved unless later historical evidence identifies it.

## 4. What is closed

For the two confirmed runtime-ahead functions, the immediate disaster-recovery risk of GitHub containing known older source is materially reduced.

Disposition moves from:
- `RUNTIME_AHEAD_RECOVERABLE`

to:
- `RECOVERED_SOURCE_PENDING_FULL_RELEASE_EQUIVALENCE`

The P0 parity program is **not globally closed** because the full authority-relevant Edge inventory has not yet been source-compared.

## 5. What is not yet proven

1. Exact normalized source hash equality has not yet been automated into a parity manifest.
2. Bundle SHA is not assumed equal to Git blob SHA.
3. Full build/redeployment equivalence remains untested; no redeployment is authorized merely to test it.
4. Other active Edge functions may still be runtime-ahead, repository-ahead, divergent, or runtime-only.
5. SQL functions/migrations have not yet received the analogous production-vs-Git parity audit.
6. The historical origin/authorization of live player-state v8 and planner v6 remains unresolved.
7. The C0273 planning branch now predates these two new `main` source-recovery commits in ancestry; planning documentation remains valid, but branch ancestry should be reconciled before eventual integration/closure.

## 6. Next bounded parity investigation

Before declaring source parity closed, build a P0/P1 authority-relevant manifest covering at minimum:
- `fpl-autonomous-gate`
- `fpl-full-pool-optimizer`
- `fpl-sequential-planner`
- `refresh-current-player-state`
- `refresh-availability-intelligence`
- `sync-fpl-data`
- `sync-gw-results`
- `sync-fpl-actual-decision`
- `sync-fpl-manager-state`
- `fpl-manager-plan-api`
- `fpl-v3-workspace-api`
- `fpl-v3-actual-live-api`
- `gameweek-status-api`
- projection/fixture refresh functions that materially feed the decision chain.

Each should receive a disposition from the Checkpoint 38 parity taxonomy based on source/dependency/auth/semantic-version evidence, not Edge version number alone.

## 7. Red-team

- Do not redeploy the newly recovered GitHub files simply to prove parity. That would turn a source-control repair into a production change with no user benefit.
- Do not mark the entire repository synchronized because the two known mismatches were recovered.
- Do not erase or squash the recovery provenance into an earlier historical commit.
- Do not assume matching version strings prove byte/source equivalence.
- Do not migrate to VPS until remaining required production components have parity dispositions and no unresolved required runtime-ahead/divergent component remains.

## Decision

The user-authorized first source-sync step is complete for the two confirmed P0 runtime-ahead functions. Canonical GitHub `main` now contains the currently deployed player-state v8 and C0248 planner v6 source, with explicit forensic provenance and no production deployment. The broader runtime/source parity audit remains open and is the next bounded task.

**Production deployment/redeployment, runtime/model/schema/cron/API behavior changes, promotion/retirement and account execution remain explicitly approval-gated.**