# C0264 — V3 Workspace Latency Optimization

Date: 2026-09-13
Parent: C0263
Scope: serving performance only; no model, optimizer, historical forecast, or V2 behavior change.

## Why this exists

C0263 removed the large page-level serial loading chain. The remaining cold FPL path is dominated by the live workspace/actual contracts. The existing live smoke takes roughly 3.6s end-to-end, but it calls `fpl-v3-workspace-api` and `fpl-v3-actual-live-api` concurrently, so the slow endpoint must be measured independently before optimizing.

## Baseline findings

`fpl-v3-workspace-api` currently has multiple serial PostgREST phases:

1. resolve default Gameweek from `current_fpl_live_plan_v01`;
2. fetch live publication + actual decision + matches + result run;
3. fetch prediction run;
4. fetch price/ownership evidence;
5. fetch player metadata + teams + frozen projections + realized player rows.

The frozen projection view itself is indexed correctly for the current access pattern. A run-1365 / 15-player `EXPLAIN ANALYZE` used `idx_model_predictions_run` and executed in about 29ms at inspection time. Historical `pg_stat_statements` nevertheless shows occasional multi-second spikes, so DB/load variability must not be confused with deterministic query cost.

## Optimization order

1. Add independent endpoint timing to the live smoke and establish a production baseline.
2. Remove avoidable client serialization: when the active Gameweek is already known, workspace and actual-live should be requested concurrently for that explicit Gameweek.
3. Collapse independent workspace DB reads into fewer PostgREST phases without changing response semantics.
4. Only if the live timing still shows a material edge, consider a narrowly scoped server-side RPC. Do not move the entire consumer contract into a large SQL function unless the simpler changes fail; that would be overengineering.
5. Add a latency regression assertion only after a stable baseline exists. Do not use a brittle budget that fails on ordinary hosted-runner/network variance.

## Integrity gates

- actual submitted team is never inferred from the engine recommendation;
- exact fail-closed phrase remains `Actual submitted team not verified`;
- `FINAL` still does not imply execution authorization;
- frozen xPts remain decision-time evidence;
- realized player values require finished-fixture evidence;
- historical forecasts are never rewritten;
- current metadata is never backfilled into historical evidence;
- missing evidence stays missing;
- V2 remains untouched.

## Completion criteria

C0264 closes only after independent production timing is recorded, the winning simplifications are merged, semantic/browser/live API gates pass, Pages deployment passes root/V2/V3 verification, and change-tracker governance returns zero violations.
