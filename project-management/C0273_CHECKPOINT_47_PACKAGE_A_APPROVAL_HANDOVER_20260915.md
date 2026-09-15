# C0273 — Checkpoint 47: Package A Approval & Conversation Handover

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Mode: GOVERNANCE / HANDOVER ONLY
Production effect: NONE

## User authorization recorded
The user explicitly approved the CP46 Package A source-recovery/equivalence operation, with one binding condition:

> Execution must NOT begin in this conversation. Save the state and begin execution only in a new conversation.

Therefore Package A status is:
- planning: COMPLETE
- approval: GRANTED
- execution: AUTHORIZED BUT DEFERRED TO NEXT CONVERSATION
- production deployment: NOT AUTHORIZED
- Package B semantic changes: NOT AUTHORIZED

## Approved Package A scope
Recover and source-control the frozen C0273 Package A authority artifacts and deployed `fpl-full-pool-optimizer` v15 adapter, reconcile branch ancestry safely, and perform isolated equivalence/disaster-recovery tests. Do not deploy or change production behavior. Stop and report any semantic/runtime difference.

## Frozen scope from CP46
Direct authority core:
- 36 private C0234/C0237/C0240/C0248 SQL functions
- 4 principal persisted authority tables
- 11 indexes across those principal tables
- 2 non-internal authority triggers
- `public.current_fpl_live_plan_v01`
- 51 live C0234/C0237/C0240/C0248 migration-ledger records
- one unrecovered P0 Edge source mismatch: deployed `fpl-full-pool-optimizer` v15 role-safe adapter
- CP39 recovered `refresh-current-player-state` v8 and `fpl-sequential-planner` v6 require equivalence evidence only, not another blind rewrite

Minimum forensic semantic inventory before dependency closure: 91 evidence/source artifacts plus recovery README/index and one canonical v15 adapter source replacement.

## Mandatory execution order in next conversation
A0 freeze evidence -> A1 create forensic recovery namespace -> A2 recover v15 adapter source -> A3 reconcile branch ancestry without overwriting CP39 -> A4 isolated reconstruction -> A5 equivalence gates -> A6 disaster-recovery rehearsal -> A7 documentation/tracker reconciliation.

Run bounded stages and checkpoint after each material stage. Do not combine recovery with semantic repair.

## Hard stop / no-behavior-change contract
Stop and report rather than improvise if any recovery requires or produces:
- production SQL/schema/constraint/trigger/view/function mutation;
- Edge deployment/redeployment;
- cron/scheduler modification;
- model/xMins/xPts/captaincy/transfer/chip/gate threshold change;
- deadline/manager-state/settlement/publication authority semantic change;
- model/planner promotion or retirement;
- VPS migration;
- FPL account action;
- any material semantic difference between recovered source and active production;
- any overwrite/regression of CP39 recovered source;
- evidence drift invalidating the frozen manifest.

These remain approval-gated separately.

## Package B contradictions preserved
Do not silently fix during Package A:
1. official FPL deadline authority split;
2. fixture completion vs official scoring settlement;
3. current private manager-state authority gap;
4. latest-row publication vs generation-valid canonical authority;
5. production-selected uniqueness / selector revision-CAS ambiguity;
6. semantic-generation and consumed-generation-vector architecture;
7. C0213 legacy optimizer hard-readiness vs C0248 canonical planner authority;
8. PRE-FINAL autonomous publication/orchestration gap;
9. scheduler ownership and later Hostinger/VPS cutover;
10. source parity is not semantic correctness.

## Repository continuity
Planning branch: `c0273-autonomous-website-planning`
CP45: `0835e3f3ea4995f73652f23365fbc1cc4535734b`
CP46: `913fbed6ed0fb970a2841c20609367564e944302`

CP39 main source recoveries that must be protected:
- `refresh-current-player-state` recovery commit `fc93e541408e6152421b8d49e1695b867167ecb6`
- `fpl-sequential-planner` recovery commit `cf8e7e41318830060fba6e2f64b1471f85167252`

The planning branch predates those main recoveries; ancestry reconciliation is therefore an explicit safety step before integration.

## Tracker continuity
At CP46, live `public.change_tracker_working` still showed C0273 Open / Planned / P0 / Pre-VPS Stabilization Planning / zero runtime-model effect with 48 implementation refs ending at CP39. CP40-CP47 tracker linkage is stale governance metadata. Do not treat that stale linkage as permission to mutate runtime. Reconcile tracker references only at A7 after recovery evidence passes, unless a new conversation explicitly decides to perform documentation-only tracker bookkeeping earlier.

## Next-conversation starting instruction
First independently re-read CP45, CP46 and this handover; verify GitHub branch/main ancestry and current Supabase evidence have not drifted. Then begin **Package A Stage A0 only**. Freeze the evidence and checkpoint it before any source write. If frozen evidence differs materially from CP45/CP46, stop and report instead of proceeding.

## Decision
Package A is approved, but execution is deliberately deferred. This checkpoint records the authorization and preserves the exact boundary for a fresh conversation.

**No Package A execution occurred in this conversation. No production behavior changed. Production deployment and Package B remain separately approval-gated.**