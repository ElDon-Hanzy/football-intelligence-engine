# C0273 — Checkpoint 48: Package A A0 Evidence Freeze

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Stage: Package A / A0 FREEZE EVIDENCE
Production effect: NONE

## Decision
A0 PASS. The apparent 54-vs-51 migration drift was a query-scope false positive, not production drift. The CP46 direct-family rule is migration names beginning with `c0234_`, `c0237_`, `c0240_`, or `c0248_`; that exact scope remains 51 records. A broader substring match additionally captures three cross-family migrations (`c0229_c0234_autonomy_run_storage`, `c0241_c0240_reuse_optimizer_horizon_guard`, `c025x_c0240_infeasible_structure_semantics_fix`) and therefore returns 54. These three remain dependency evidence, not members of the frozen 51 direct-family ledger set.

No canonical source recovery was performed. No production SQL/schema/trigger/view/function, Edge deployment, scheduler, model, planner, FPL account, or runtime behavior was changed.

## Frozen Git ancestry
- planning branch pre-freeze head: `c035dce3cee36c3a38dc2359b4337dddc7da2c7b`
- CP46: `913fbed6ed0fb970a2841c20609367564e944302`
- CP45: `0835e3f3ea4995f73652f23365fbc1cc4535734b`
- main protected CP39 recoveries: `fc93e541408e6152421b8d49e1695b867167ecb6`, `cf8e7e41318830060fba6e2f64b1471f85167252`
- compare at A0: planning branch diverged from main; 64 ahead / 2 behind; merge base `56accac4fe8da336dfda8d7134464bac40d1ce4a`.

## Frozen direct migration ledger inventory
All 51 direct-family records have one statement each. Representative CP45/CP46 statement hashes were rechecked and all matched exactly. Complete frozen inventory (version | name | statement MD5):

20260908213853 | c0234_c0213_readiness_bridge | 75ed99c762b934cc9fae92918e2ed260
20260909173747 | c0237_always_live_fpl_plan_publication_v01 | b2f890eede0a52ccc0836174ca5c6484
20260909174251 | c0237_require_complete_layer_lineage_v02 | 1358c52e400d7390f8aad0ca2878d011
20260910214124 | c0240_final_adversarial_evidence_v01 | 16fad589b688b92a34a15081ec6b7467
20260910214830 | c0240_distributed_adversarial_queue_v01 | 74d2feaf191c2ac418f28fa43a25772f
20260910215539 | c0240_same_horizon_path_role_gate_v02 | 03757e78729d2451d204ac6a632e48c6
20260910215616 | c0240_incremental_orchestrator_v01 | 1d27e32c11bc5a096ac7c6652533714f
20260910215911 | c0240_exact_slot_and_path_search_v03 | d7996a1e3da52b55ab751800e7ce57ee
20260910224617 | c0240_register_path_evaluator | 270b0eac661e3997683658acd2097489
20260910224822 | c0240_route_path_tasks_to_dedicated_evaluator | d3f671f857550814ca9eaf42ae5ab40f
20260910225021 | c0240_finalize_v04_path_contract | 97327bbb022b622bfb35cc36adc8b0dc
20260910225227 | c0237_require_c0240_lineage | 420fbd1eb8a878dc25065e5a3d837a12
20260910225325 | c0240_prediction_lineage_enrichment | 1749f3084f35ef5a66e065a4093ebe02
20260910230002 | c0237_render_c0240_survivor | 01583728e808381b02d7bccf1680cd5b
20260910230248 | c0240_consumption_contract_and_behavioral_proofs | d9b72c7ff2f06a93032e34b81536f461
20260911003757 | c0240_optimizer_policy_signature | b7d4ba229a35712c5ab32034e9f4e90e
20260911004039 | c0240_break_publication_cycle | 63a9d71431783c54507549bcad730501
20260911004718 | c0240_adversarial_repeat_status | d03c62b3e0be85f98f2d13051c5d04af
20260911004835 | c0240_repeat_cycle_orchestration | c0f6521dd5c69907500050deb251223a
20260911005044 | c0240_legal_slot_challenger_repair | bcd72b76e2c3098fdd5f0ceb56d02865
20260911080741 | c0240_closeout_regression_contract_v2 | 6f9bb4ec8d5095ba5f37297d51192801
20260911132737 | c0248_sequential_planner_storage_and_status | 8339f8cff8cbe61a8fbbd0ba985a7ff2
20260911132946 | c0248_dispatch_allowlist | 22756f0ba5cc111dd437c27d1cffe715
20260911134409 | c0248_price_predictor_snapshot_storage | 00d09423d5054238d6027830814236f3
20260911134507 | c0248_price_timing_evaluator | d924cae73cd7fef83f12bdf95fd54f44
20260911134652 | c0248_chip_timing_exact_horizon | 0272c08b4c215323a9706d788ffd196e
20260911134825 | c0248_wildcard_same_utility_benchmark | 2a434183c6c20d4a82dd34fcc4736ea2
20260911134856 | c0248_wildcard_same_utility_benchmark_alias_fix | b745230a7fce31a30d4eac78db65b221
20260911135140 | c0248_terminal_state_option_value_gate | 52a404b72110b14c9f7b80798c9b5654
20260911135445 | c0248_current_chip_action_status | 9da6b7b05bea9a4314af78d4c3843ccb
20260911135522 | c0248_free_hit_opportunity_sensitivity_fix | cbfad44cefb73e829c9c0ef3398e4c20
20260911135555 | c0248_decision_control_status | d6f6c387ec0ac4b04fd9e71a72e4a4a2
20260911135858 | c0248_live_publication_integration | 51d7216689ca2ab9add3828ccaa77838
20260911142534 | c0248_c0244_structural_chip_window_guard | 0c5e3e1368ae63d816db29ff5e55a37e
20260911142605 | c0248_c0245_terminal_option_guard_v02 | 75e4978be5e51a28b9735f7f4c34794b
20260911144813 | c0248_c0245_empirical_ft_option_calibration | 1e950a86d32b2ba7f0abf24d55079555
20260911144842 | c0248_c0245_option_value_status | 359749db06d5b5500208351aef434984
20260911145807 | c0248_c0245_future_information_optionality_v01 | 1c7ac5a0ca99f7a3c53947dd2c6cdb11
20260911145942 | c0248_c0245_future_information_optionality_v02 | 9bc12c4a8fdfc25d31578ab5163fdf5b
20260911150034 | c0248_integrate_mature_c0245_option_value | 7ac4b84a87c937004158c0bfe20b3727
20260911151816 | c0248_c0244_mature_first_half_chip_control | c687750912ed5302f69a13a5cd37171a
20260911154010 | c0248_same_lineage_chip_price_fh_repair | 000f2c3a939e5e255661053e93430f9e
20260911155935 | c0248_v06_cutover_candidate_consumers | 2f71d906118dde92a49d01624a50b7aa
20260911160046 | c0248_v06_expose_selected_chip_roots | 950c7757e17d0fffc793008aa55134f2
20260911160226 | c0248_c0237_selected_path_publication_cutover | c91bb11ddda8269561cf6cbb253eb6d8
20260911160347 | c0248_verified_candidate_promotion_contract | 7d97842d415013ca9b01622d750d883d
20260911160418 | c0248_production_promotion_fail_closed_bridge | 9d1dce02c9451d0ac93ada0b6dbc3614
20260912124034 | c0237_current_projection_lineage_fix | f355412c5a209c3c6ff79a4c2db8dba4
20260912124250 | c0237_publish_contested_when_c0248_not_promoted | 56c249a3de33879a4e139639129ec2b3
20260912162507 | c0248_decouple_selector_and_post_deadline_chip_closure | 463641876b82fce4559ea0c208493da9
20260912162810 | c0237_post_deadline_final_closure_publication | 9e68a67d04db623725ce2b01123c9022

A0 direct inventory aggregate MD5 over `version:name:statement_md5` in version/name order: `66b9d8bac51fd1f1581d8b75a850714d`.

## Frozen current authority inventory
- direct private authority functions: 36
- principal persisted authority tables: 4
- indexes on those tables: 11
- non-internal authority triggers: 2
- current serving view: `public.current_fpl_live_plan_v01`

The CP45 headline normalized function fingerprints were recomputed using the same normalization (`regexp_replace(definition, '\s+', ' ', 'g')`) and all 12 matched exactly. The serving view hash also matched exactly: `4aab3801992b9a8d42e9d1287d0ea36c`.

Frozen trigger identities:
- `trg_c0240_enrich_prediction_lineage` on `public.fpl_final_adversarial_runs` -> `private.c0240_enrich_prediction_lineage_v01()`
- `trg_block_fpl_live_plan_publication_mutation_v01` on `public.fpl_live_plan_publications` -> `private.block_fpl_live_plan_publication_mutation_v01()`

Frozen index counts remain 2 / 3 / 3 / 3 across autonomous-gate / final-adversarial / live-publication / sequential-planner tables respectively.

## Frozen Edge identities
- `fpl-full-pool-optimizer`: ACTIVE v15, verify_jwt=false, bundle SHA256 `a78db08b4d5a32407c76797ba3f7ad4168a7c92af765a1c1017e05c916a20576`, adapter marker `C0240_ROLE_SAFE_OPTIMIZER_ADAPTER_V03_MANAGER_FT`, delegates to `fpl-full-pool-optimizer-core-v02`.
- delegated core `fpl-full-pool-optimizer-core-v02`: ACTIVE v1, bundle SHA256 `4ec2190c581a1c2d65ce09272f901a015a9221e80434e261f43b3b6add4fce94`; imports pinned GitHub commit `43826b99eb6eaa9ac0cc044a541ea706eff46b0a`.
- CP39 `refresh-current-player-state`: ACTIVE v8, bundle SHA256 `9d475ca909aebf3a50fe44edf563d579f932d556352879af76864bc1ca298753`.
- CP39 `fpl-sequential-planner`: ACTIVE v6, bundle SHA256 `e6387be4c603b5f47a8fa8b1368a218197c46a1f0c96c2774d1190ac6d9d2055`.

The v15 adapter source was read from active runtime for A0 evidence verification only. It was NOT written to the canonical GitHub Edge path in A0; that remains A2.

## Tracker state
Live `public.change_tracker_working` remains C0273 Open / Planned / P0 / Pre-VPS Stabilization Planning with zero runtime/model effect and implementation references ending at CP39. No tracker mutation was made.

## A0 adjudication
PASS. No material production evidence drift from CP45/CP46 was found after applying the frozen direct-family scope and identical hash normalization. The initial 54 count was caused by a broader substring query and is preserved here as an audit lesson rather than hidden.

## Next approved bounded action
A1 may now create the forensic recovery namespace under `supabase/recovery/c0273/` and materialize the exact ledger/current evidence with the CP45 provenance warnings. A1 must not modify canonical Edge source, production, or CP39 recovered source. A2 remains the separate canonical v15 adapter recovery step.
