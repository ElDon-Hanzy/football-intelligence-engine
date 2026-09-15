# C0273 — Checkpoint 46: Package A Final Approval Dossier

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Mode: PLANNING / READ-ONLY SCOPE FREEZE
Production effect: NONE

## Authorization boundary
CP46 freezes the Package A recovery scope only. No production SQL/schema/trigger/Edge/runtime/model/cron/API/UI/publication/selector behavior was changed; no source recovery was executed. Production changes and Package A execution remain explicitly approval-gated.

## Executive decision
Package A planning is now sufficiently bounded. Further planning without execution would have diminishing returns.

Package A purpose: restore reproducible source/provenance for the currently deployed authority graph with **zero intended semantic or runtime behavior change**.

Package B remains separate and contains all known semantic repairs.

## 1. Live tracker state reverified
Read-only production query on 2026-09-15:
- C0273 status: Open
- delivery_stage: Planned
- priority: P0
- phase: Pre-VPS Stabilization Planning
- model_effect: `None. Planning/documentation only; zero runtime/model effect.`
- implementation_refs: 48 and still stop at CP39 / the two CP39 recovery commits.

Therefore CP40-CP46 tracker linkage remains stale governance metadata. It is not a runtime blocker and was not modified here.

## 2. Frozen authority scope
The direct private SQL function family count currently in the C0234/C0237/C0240/C0248 namespace is **36 functions**.

The principal persisted authority tables confirmed in scope are:
- `public.fpl_autonomous_gate_runs`
- `public.fpl_final_adversarial_runs`
- `public.fpl_live_plan_publications`
- `public.fpl_sequential_planner_runs`

The queried authority-table set exposes **11 indexes** in total:
- autonomous gate runs: 2
- final adversarial runs: 3
- live plan publications: 3
- sequential planner runs: 3

Two non-internal authority triggers are confirmed:
1. `trg_c0240_enrich_prediction_lineage` on `fpl_final_adversarial_runs` -> `private.c0240_enrich_prediction_lineage_v01()`.
2. `trg_block_fpl_live_plan_publication_mutation_v01` on `fpl_live_plan_publications` -> `private.block_fpl_live_plan_publication_mutation_v01()`.

The current-plan serving view remains in scope:
- `public.current_fpl_live_plan_v01`.

Important: these counts are the frozen **direct authority-core inventory**, not a claim that only these objects are required for a clean replay. Dependency closure can add supporting tables/functions/types/extensions during isolated reconstruction. Those are recovered as dependencies, not silently treated as new authority.

## 3. Migration evidence scope
CP44 established 51 applied live migration records across the direct C0234/C0237/C0240/C0248 families:
- C0234: 1
- C0237: 7
- C0240: 16
- C0248: 27

CP45 established per-migration ledger fingerprints and current-object fingerprints. Package A must extract the exact live ledger statements rather than reconstructing SQL from prose or rewriting historical chronology.

## 4. Edge scope
Package A contains exactly one known unrecovered P0 Edge source mismatch:
- deployed `fpl-full-pool-optimizer` v15 role-safe adapter vs older C0228 implementation at the canonical GitHub slug path.

It also includes equivalence evidence, but no second recovery write, for the two CP39 recovered components:
- `refresh-current-player-state` v8;
- `fpl-sequential-planner` v6.

The historical delegated optimizer core `fpl-full-pool-optimizer-core-v02` remains pinned and must not be collapsed into the adapter identity.

## 5. Authority release-manifest schema
The Package A manifest must represent the deployed authority graph rather than a single version string. Minimum fields per object/artifact:
- `artifact_id`
- `artifact_type` = migration | function | view | trigger | table | index | edge_function | constraint/dependency
- `schema`
- `name`
- `deployed_identity` / Edge version where applicable
- `semantic_marker`
- `authority_effect` (E1-E7 where applicable)
- `first_known_migration`
- `altering_migrations[]`
- `last_known_semantic_writer`
- `ledger_statement_hash`
- `current_definition_hash`
- `source_control_path`
- `source_control_commit`
- `recovery_provenance`
- `dependencies[]`
- `consumers[]`
- `equivalence_class`
- `parity_disposition`
- `package` = A
- `intended_behavior_change` = false
- `approval_state`

For the optimizer adapter additionally record:
`deployed slug/version -> adapter semantic identity -> delegated core slug/source identity -> downstream returned optimizer_version`.

## 6. Recovery ordering
Package A execution, if later approved, must use this order:

### A0 — Freeze evidence
Export exact migration-ledger statements, current definitions, object metadata, Edge v15 source/config/bundle identity and CP39 runtime identities. Generate manifest hashes before any canonical source write.

### A1 — Create forensic recovery namespace
Write ledger/current snapshots and manifest under `supabase/recovery/c0273/` with explicit `NOT ORIGINAL GIT DEPLOYMENT COMMIT` and `DO NOT REPLAY BLINDLY INTO PRODUCTION` provenance.

### A2 — Recover v15 adapter source
Restore the active role-safe adapter to the canonical Edge slug path while preserving the separately pinned core. This is a GitHub source operation only; no deployment.

### A3 — Reconcile branch ancestry
Integrate without overwriting CP39 main recoveries (`fc93e541...` and `cf8e7e413...`). Planning-branch ancestry must not reintroduce older function source.

### A4 — Isolated reconstruction
Build an empty/non-production environment from canonical repository baseline plus forensic recovery artifacts. Discover and explicitly add dependency closure required for faithful reconstruction.

### A5 — Equivalence gates
Compare function signatures/security/search_path, views, triggers, indexes/constraints, normalized definitions and deterministic read-only behavior. Validate CP39 recoveries and v15 adapter against frozen runtime evidence.

### A6 — Disaster-recovery rehearsal
Prove the authority graph can be reconstructed from GitHub + documented Supabase durable-state assumptions without hidden live source.

### A7 — Documentation/tracker reconciliation
Only after evidence passes, update durable project documentation and tracker references. This is governance bookkeeping; it must not manufacture runtime readiness.

No production deployment is part of Package A.

## 7. No-behavior-change diff contract
Package A automatically fails and must stop for user review if any proposed recovery diff would:
- change SQL semantics rather than preserve/recover them;
- alter a production table/schema/constraint/trigger/view/function;
- deploy/redeploy an Edge Function;
- alter scheduler/cron ownership or cadence;
- change model coefficients, xMins, xPts, captaincy, transfer/chip selection, uncertainty, adversarial thresholds or gates;
- change official-deadline interpretation;
- change manager-state authority;
- change settlement/finality semantics;
- change publication-currentness/canonical selection;
- promote/retire/kill a model or planner;
- execute or authorize an FPL account action.

Any such discovery is reclassified to Package B (or a separately approved production repair).

## 8. Exact initial recovery action count
The approval dossier authorizes a bounded initial source-recovery operation, not arbitrary cleanup.

Initial planned write classes:
1. 51 exact ledger recovery artifacts (one per direct authority migration record).
2. Current-definition recovery artifacts for the 36 direct private authority functions, plus the current-plan view and 2 authority triggers; supporting object snapshots are added only through documented dependency closure.
3. One authority release manifest plus provenance README/recovery index.
4. One canonical Edge source recovery for `fpl-full-pool-optimizer` v15 adapter.
5. No repeat source rewrite for the two CP39 recoveries; equivalence evidence only.

Because tables/indexes/constraints are represented both by ledger chronology and current-state inventory, they should not be counted as independent reconstructed historical migrations. Their current definitions/invariants are captured in the manifest and isolated-rebuild evidence.

Expected minimum forensic artifacts before dependency closure: **91 evidence/source artifacts** = 51 ledger + 36 function current definitions + 1 view + 2 trigger definitions + 1 manifest, plus README/index documentation and the single canonical v15 adapter source replacement. Exact filesystem count may differ if related current definitions are grouped, but semantic inventory count may not be reduced.

## 9. Red-team: failure modes that invalidate approval
Even after approval, execution must stop rather than improvise if:
- ledger statements cannot replay without an undocumented dependency;
- current catalog differs materially from ledger-replayed final state;
- recovered v15 adapter cannot be proven behaviorally equivalent to active runtime;
- branch reconciliation would overwrite CP39 recovered source;
- current object fingerprints drift between freeze and recovery;
- production changes occur concurrently that invalidate the frozen manifest;
- a source-only repair requires a live schema/runtime change to succeed;
- any Package B semantic fix is necessary to make Package A tests pass.

A failed equivalence test is evidence, not permission to patch production.

## 10. Contradictions explicitly preserved for Package B
Package A intentionally reproduces rather than fixes these known issues:
- official FPL deadline authority split;
- fixture-complete vs official scoring settlement finality;
- current private manager-state authority gap;
- latest-row publication serving vs generation-valid canonical authority;
- possible multiple `production_selected=true` planner rows / lack of explicit selector revision-CAS authority;
- semantic-generation and consumed-generation-vector architecture not implemented;
- C0213 legacy optimizer hard-readiness dependency vs C0248 canonical selected-path authority;
- PRE-FINAL recurring autonomous publication/orchestration gap;
- scheduler ownership and eventual VPS cutover;
- source parity does not prove semantic correctness.

## 11. Approval unit
If the user later approves Package A, the approval should mean only:

> Recover and source-control the frozen C0273 Package A authority artifacts and v15 optimizer adapter, reconcile branch ancestry safely, and perform isolated equivalence/disaster-recovery tests. Do not deploy or change production behavior. Stop and report any semantic/runtime difference.

It does **not** approve Package B, production deployment, migration replay into production, planner promotion, model changes, scheduler changes, VPS migration or FPL-account execution.

## 12. CP46 recommendation
**Package A planning: COMPLETE / READY FOR EXPLICIT APPROVAL.**

There is no meaningful benefit in extending Package A with additional planning checkpoints before execution. The next useful decision is binary:
- approve Package A source recovery/equivalence work; or
- defer Package A and continue planning a separate Package B semantic-repair priority sequence.

Package A should be completed before Hostinger/VPS migration because migrating while the canonical source cannot reproduce the live authority graph would carry unresolved recovery debt into the new runtime.

## Decision
CP46 freezes the direct authority-core scope, release-manifest contract, recovery ordering, no-behavior-change boundary, minimum artifact inventory, stop conditions and approval semantics. It confirms that the live system has useful fail-closed controls but remains source-recovery incomplete.

**No production behavior changed. Package A execution and every production change remain explicitly approval-gated.**