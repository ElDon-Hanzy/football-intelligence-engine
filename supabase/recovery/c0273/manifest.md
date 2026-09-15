# C0273 Package A — Frozen Authority Manifest

> **NOT ORIGINAL GIT DEPLOYMENT COMMIT — DO NOT REPLAY BLINDLY INTO PRODUCTION**

A0 checkpoint commit: `2a88463727fc25e86333a04bd8e9281c3626df34`
A1 namespace parent: `ecbbd5fb32f0e332e54ed048bc365fa579d9dc48`
Package: A
Intended behavior change: false
Approval state: approved for source recovery/equivalence only

## Direct migration ledger

Frozen direct count: **51**. Family counts: C0234=1, C0237=7, C0240=16, C0248=27. Every record has exactly one statement entry in `supabase_migrations.schema_migrations` at freeze time.

Representative immutable ledger fingerprints reverified at A0:

| version | name | md5(statement[1]) |
|---|---|---|
| 20260908213853 | c0234_c0213_readiness_bridge | 75ed99c762b934cc9fae92918e2ed260 |
| 20260909173747 | c0237_always_live_fpl_plan_publication_v01 | b2f890eede0a52ccc0836174ca5c6484 |
| 20260909174251 | c0237_require_complete_layer_lineage_v02 | 1358c52e400d7390f8aad0ca2878d011 |
| 20260910214124 | c0240_final_adversarial_evidence_v01 | 16fad589b688b92a34a15081ec6b7467 |
| 20260910215616 | c0240_incremental_orchestrator_v01 | 1d27e32c11bc5a096ac7c6652533714f |
| 20260910215911 | c0240_exact_slot_and_path_search_v03 | d7996a1e3da52b55ab751800e7ce57ee |
| 20260911080741 | c0240_closeout_regression_contract_v2 | 6f9bb4ec8d5095ba5f37297d51192801 |
| 20260911132737 | c0248_sequential_planner_storage_and_status | 8339f8cff8cbe61a8fbbd0ba985a7ff2 |
| 20260911135555 | c0248_decision_control_status | d6f6c387ec0ac4b04fd9e71a72e4a4a2 |
| 20260911160226 | c0248_c0237_selected_path_publication_cutover | c91bb11ddda8269561cf6cbb253eb6d8 |
| 20260911160347 | c0248_verified_candidate_promotion_contract | 7d97842d415013ca9b01622d750d883d |
| 20260911160418 | c0248_production_promotion_fail_closed_bridge | 9d1dce02c9451d0ac93ada0b6dbc3614 |
| 20260912162810 | c0237_post_deadline_final_closure_publication | 9e68a67d04db623725ce2b01123c9022 |

Direct inventory identity hash at A0: `66b9d8bac51fd1f1581d8b75a850714d`.

## Current authority definitions

Direct private function count: **36**. Headline normalized fingerprints:

| artifact | normalized definition md5 |
|---|---|
| private.c0234_autonomous_gate_status_v01 | f8849e714d253c847d3b9500fcd59b0c |
| private.c0237_publish_current_fpl_plan_core_v01 | 4102bbc3579050089b1f791b5e906220 |
| private.c0237_publish_current_fpl_plan_pre_c0248_v01 | 2ef840562c4e95767480267652494d5f |
| private.c0237_publish_current_fpl_plan_v01 | 9934bd4335bee424de2a1525b56ffa71 |
| private.c0240_adversarial_status_v01 | 23f694b75b195397619a33aea51347d0 |
| private.c0240_finalize_v01 | d55e89dbd62fe0a98e98f0168dd384e6 |
| private.c0240_orchestrate_v01 | 03b0b608e0aa8222ac17776de23f8826 |
| private.c0248_decision_control_status_v01 | 511b7d55f770ee6c0c431aec8b634de8 |
| private.c0248_planner_status_v01 | c682d92b91f388746cd8520ceb504682 |
| private.c0248_production_selector_status_v01 | 3cde6f22c634c91893c0e2a50c2cf279 |
| private.c0248_promote_verified_candidate_v01 | 209643bfb62e7b13ec99836241dda858 |
| private.c0248_render_selected_current_plan_v01 | 878f012944ca1df1b0f20073445a2e3c |
| public.current_fpl_live_plan_v01 | 4aab3801992b9a8d42e9d1287d0ea36c |

Other current direct-function fingerprints are retained by the A0 evidence capture and must be reproduced in `current/` without semantic editing before A1 closes.

## Principal persisted authority objects

Tables:
- `public.fpl_autonomous_gate_runs`
- `public.fpl_final_adversarial_runs`
- `public.fpl_live_plan_publications`
- `public.fpl_sequential_planner_runs`

Indexes: **11 total** = 2 / 3 / 3 / 3 respectively.

Triggers:
- `trg_c0240_enrich_prediction_lineage` on `public.fpl_final_adversarial_runs` -> `private.c0240_enrich_prediction_lineage_v01()`.
- `trg_block_fpl_live_plan_publication_mutation_v01` on `public.fpl_live_plan_publications` -> `private.block_fpl_live_plan_publication_mutation_v01()`.

## Edge runtime identities

`fpl-full-pool-optimizer`: deployed **v15**, role-safe adapter; canonical GitHub source is older and is recovered in A2 only. The delegated `fpl-full-pool-optimizer-core-v02` remains a separate pinned identity and must not be collapsed into the adapter.

Protected CP39 recoveries — equivalence only, never overwrite:
- `refresh-current-player-state` v8; recovery commit `fc93e541408e6152421b8d49e1695b867167ecb6`.
- `fpl-sequential-planner` v6; recovery commit `cf8e7e41318830060fba6e2f64b1471f85167252`.

## Branch ancestry hazard

Planning/recovery branch originated before both protected CP39 main recoveries. At A0 the planning branch was ahead of main by its planning history but behind by the two protected recovery commits. A3 must integrate ancestry without reintroducing older Edge source.

## Package-B contradictions intentionally preserved

Official deadline authority split; fixture-complete vs official scoring settlement; private manager-state authority gap; latest-row publication serving vs generation-valid canonical authority; possible multiple `production_selected=true` rows / selector revision-CAS gap; semantic-generation vector architecture absent; legacy optimizer hard-readiness dependency; PRE-FINAL recurring orchestration gap; scheduler ownership/VPS cutover. Recovery parity is not permission to repair any of these.
