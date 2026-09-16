# C0278 — Full Engine Audit & Reconciliation — Closeout — 2026-09-17

## Outcome
C0278 whole-engine reconciliation is GREEN for proceeding into C0277 P0/P1, subject to the existing fail-closed production gates. This closeout does not authorize a transfer, chip, FINAL publication, C0265 change, or concurrency change.

## Verified live governance
- C0213 architecture registry: `system_consolidation_ok=true`.
- Behavioral production-effect proof: 14/14 current PASS after re-proof.
- Required capabilities: 19/19.
- Tracker consumption governance: 99/99 covered; zero violations.
- No active duplicate cron targets.
- No active retired API/Edge/external deployments.
- Prediction-effect provenance for current GW5 lineage is healthy; latest inspected prediction run 1401 has 604 prediction rows and complete baseline/lambda/fixture/event lineage coverage.
- Storage retention: database ~955 MB; `frozen_model_predictions_mutated=false`; C0197 append-only preservation true.
- C0213 retirement manifest: 19/19 physically deleted items retain durable rollback source; zero holds.

## Runtime reconciliation
- 30 active cron jobs after retirement of orphan C0274 GW6 every-minute reprojection cron.
- C0274 hard-availability invalidation remains integrated in the canonical C0217 horizon cycle and is now tracked/documented.
- C0276 autonomous tick remains active every five minutes and is fail-closed at FINAL_GATE governance wait.
- Recent C0276 cron execution is healthy after one isolated earlier failure; subsequent executions repeatedly succeeded.
- No external FPL execution path was introduced.

## C0274 reconciliation
Migration provenance for the hard-availability invalidation/reprojection functions was recovered from deployed migration history. C0274 was added to the tracker and production-consumption contract. The redundant unsourced every-minute GW6 cron was unscheduled because the canonical C0217 horizon cycle already owns invalidation detection/recovery.

Evidence: `project-management/C0278_C0274_RUNTIME_PROVENANCE_RECONCILIATION_20260916.md`.

## C0273 source-parity status
C0273 remains an intentional open planning program, not a blocker that should be falsely marked complete. Its earlier P0 runtime/source contradiction for `refresh-current-player-state` and `fpl-sequential-planner` was partially recovered to GitHub. Live `fpl-sequential-planner` is now v7: a small C0276 lineage-binding wrapper importing the frozen verified C0248 V06 source at commit `a6ecd3ff63ebda25e35b3a8ebea53fc210906aa8`. The underlying V06 source is present in GitHub. Broader C0273 pre-VPS planning remains open by design and is not silently closed by C0278.

## C0277 P0 root cause
The previously observed `V06_PLANNER_RUN_MISSING` / `BOUNDED_OPTION_INPUT_NOT_READY` is horizon-dependent:
- V06 exact planner is READY at GW5 H=3.
- no V06 planner run exists at H=5 or H=15.
- C0276 bounded chip option-value succeeds at H=3 and currently recommends `NONE` under the existing fail-closed preservation policy.

Therefore the demonstrated defect is a horizon-contract mismatch: a seasonal/first-half window length was being passed into helpers requiring an exact numerical V06 sequential-planner horizon. The repair must explicitly separate `exact_decision_horizon` from `seasonal_chip_window`.

Evidence: `project-management/C0278_C0277_ROOT_CAUSE_HORIZON_CONTRACT_20260916.md`.

The embedded `result.planner_version` label on a production-selected row remains a provenance/representation inconsistency worth normalizing later, but it is not the demonstrated root cause of the H=15 missing-run condition.

## C0277 readiness
C0277 may proceed because:
1. whole-engine governance is green;
2. exact-horizon chip evidence is demonstrably healthy at the valid numerical horizon;
3. future first-half evidence is already explicitly tiered as exact vs structural-only;
4. the required P0 integration repair is bounded and does not require fabricated GW9+ player precision;
5. C0248 remains the sole selected-path authority and C0276/C0234 remain fail closed.

C0277 must implement the canonical plan stages P0-P5. P0 must first formalize the dual-horizon contract. P1 may then construct chronology-safe reservation-value evidence without fake player precision.

## Protected invariants
- C0265 unchanged.
- C0240 concurrency unchanged.
- Historical forecasts append-only.
- Missing data remains unknown.
- No transfer/chip execution.
- No early FINAL authorization.
- C0248 remains sole selected-path authority.
- C0276/C0234 remain fail closed.
