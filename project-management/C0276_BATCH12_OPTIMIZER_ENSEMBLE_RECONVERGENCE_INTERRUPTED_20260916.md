# C0276 Batch 12 — Optimizer/Ensemble Reconvergence Interrupted by Fresh Fixture Event

Date: 2026-09-16

## Scope
Resume Cycle #2 from Projection #1388 / Uncertainty #1388 and advance only through optimizer and ensemble if lineage remains current.

## Work and evidence
- Initial event scan: 0 new events.
- Verified the live optimizer still uses a three-GW horizon and selected immutable prediction runs GW5 #1388, GW6 #1385, GW7 #1386.
- Invoked `fpl-full-pool-optimizer`; request #7228 returned HTTP 200 / `OPTIMIZED_READ_ONLY`.
- Captured optimizer run #36. It is read-only, decisioning=false, writes_manager_plan=false, and uses prediction runs #1388/#1385/#1386.
- Reconciled OPTIMIZER READY #36 only after exact prediction-run checks.
- Dispatched governed C0276 ensemble request #7229 pinned to optimizer #36.
- Request #7229 returned HTTP 200 / `ENSEMBLE_READY` and created ensemble run #13. Run #13 is immutable (`historical_forecasts_rewritten=false`) and classified `NEAR_EQUIVALENT_SENSITIVITY_REQUIRED`, top-second gap 1.035 points.
- Reconciled ENSEMBLE READY #13 against the governed request ledger.

## Fresh event / fail-closed result
The mandatory post-work event scan then detected a new `FIXTURE_LINEAGE_CHANGED` event (event #10): observed signature `86efeb8bd46db8452f337172ba516f5c`, prior cycle signature `1fc17411e2f05bc0fb06123d20e79fbd`.

The C0276 invalidation graph correctly returned PLAYER_PROJECTION, UNCERTAINTY, OPTIMIZER, ENSEMBLE and all downstream nodes to STALE. Therefore optimizer #36 and ensemble #13 are retained as immutable historical evidence but are not current Cycle #2 authority and must not be promoted downstream.

This is a second production proof that event-triggered invalidation interrupts reconvergence safely.

## Invariants
- No FPL transfer or chip executed.
- No publication.
- No historical forecast rewrite.
- No decision/noise gate weakened.
- C0240 concurrency unchanged; no 5-worker test.
- C0265 unchanged.
- Superseded C0240 batch #231 remains abandoned.

## Exact next batch
Reconcile the new fixture signature first. Determine whether the change is material to the GW5 canonical fixtures and whether Projection #1388 still exactly matches. If not, append a new projection, regenerate uncertainty, then reconverge optimizer and ensemble again. Do not reuse optimizer #36 or ensemble #13 as current authority after event #10.