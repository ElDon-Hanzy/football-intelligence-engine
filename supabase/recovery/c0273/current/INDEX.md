# A1 Current Authority Catalog Index

> **NOT ORIGINAL GIT DEPLOYMENT COMMIT — DO NOT REPLAY BLINDLY INTO PRODUCTION**

A0/A1 live catalog freeze contains 36 direct private authority functions, one current-plan serving view, two non-internal authority triggers, four principal persisted authority tables, and eleven indexes. Current definitions are forensic final-state evidence and must not be substituted with the last migration text where catalog state differs.

Direct private functions:

- private.c0234_autonomous_gate_status_v01
- private.c0237_publish_current_fpl_plan_core_v01
- private.c0237_publish_current_fpl_plan_pre_c0248_v01
- private.c0237_publish_current_fpl_plan_v01
- private.c0240_adversarial_status_v01
- private.c0240_capture_v01
- private.c0240_deterministic_regression_v01
- private.c0240_dispatch_batch_v01
- private.c0240_enrich_prediction_lineage_v01
- private.c0240_expand_role_tasks_v01
- private.c0240_finalize_v01
- private.c0240_orchestrate_v01
- private.c0240_prepare_base_v05
- private.c0240_prepare_repeat_v01
- private.c0240_prepare_v01
- private.c0240_repair_slot_challenger_v01
- private.c0248_c0245_option_value_status_v01
- private.c0248_c0245_option_value_status_v02
- private.c0248_c0245_option_value_status_v03
- private.c0248_chip_timing_status_v01
- private.c0248_current_chip_action_status_v01
- private.c0248_decision_control_candidate_status_v01
- private.c0248_decision_control_status_v01
- private.c0248_free_hit_same_utility_status_v01
- private.c0248_ft_option_calibration_v01
- private.c0248_future_information_optionality_v01
- private.c0248_future_information_optionality_v02
- private.c0248_planner_status_v01
- private.c0248_price_timing_status_v01
- private.c0248_production_selector_status_v01
- private.c0248_promote_verified_candidate_v01
- private.c0248_render_selected_current_plan_v01
- private.c0248_structural_chip_window_status_v01
- private.c0248_terminal_state_sensitivity_v01
- private.c0248_terminal_state_sensitivity_v02
- private.c0248_wildcard_same_utility_benchmark_v01

Serving view: `public.current_fpl_live_plan_v01`.

Authority triggers:
- `trg_c0240_enrich_prediction_lineage` -> `private.c0240_enrich_prediction_lineage_v01()`.
- `trg_block_fpl_live_plan_publication_mutation_v01` -> `private.block_fpl_live_plan_publication_mutation_v01()`.

Principal tables: `fpl_autonomous_gate_runs`, `fpl_final_adversarial_runs`, `fpl_live_plan_publications`, `fpl_sequential_planner_runs`.

Index count = 11. Current catalog metadata (signature, volatility, security-definer, search_path, index definitions and trigger definitions) was captured read-only during A0 and is part of the equivalence contract.
