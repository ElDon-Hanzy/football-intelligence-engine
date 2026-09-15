# C0273 — Checkpoint 43: SQL / Control-Plane Authority Audit

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Mode: PLANNING / READ-ONLY FORENSIC AUDIT
Production effect: NONE

## Authorization boundary
No SQL, schema, trigger, runtime, model, cron, API, UI, source recovery, publication, promotion/retirement, or FPL-account behavior was changed. All production changes remain explicitly approval-gated.

## 1. Why CP43
CP42 narrowed the known Edge source mismatch to one unrecovered artifact (`fpl-full-pool-optimizer` v15 adapter) and identified the next risk surface as the database control plane behind C0248 -> C0240 -> C0234 -> C0237.

## 2. Live SQL authority inventory
Read-only catalog inspection proves a substantial private SQL control plane exists in production.

### C0240 adversarial family
Live private functions include:
- c0240_adversarial_status_v01
- c0240_capture_v01
- c0240_deterministic_regression_v01
- c0240_dispatch_batch_v01
- c0240_enrich_prediction_lineage_v01
- c0240_expand_role_tasks_v01
- c0240_finalize_v01
- c0240_orchestrate_v01
- c0240_prepare_base_v05
- c0240_prepare_repeat_v01
- c0240_prepare_v01
- c0240_repair_slot_challenger_v01

Therefore C0240 final adversarial authority is not absent; it is primarily SQL/control-plane based rather than represented by a same-named Edge Function.

### C0248 planner/selector family
Live private functions include:
- c0248_planner_status_v01
- c0248_decision_control_candidate_status_v01
- c0248_decision_control_status_v01
- c0248_production_selector_status_v01
- c0248_promote_verified_candidate_v01
- c0248_render_selected_current_plan_v01
- chip, option-value, FT calibration, future-information optionality, price-timing, terminal-sensitivity, wildcard/free-hit utility helpers.

This is a larger canonical decision/control surface than the Edge-only parity audit represented.

### C0234/C0237 authority/publication family
Live private functions include:
- c0234_autonomous_gate_status_v01
- c0237_publish_current_fpl_plan_core_v01
- c0237_publish_current_fpl_plan_pre_c0248_v01
- c0237_publish_current_fpl_plan_v01

## 3. Critical live behavior traced

### 3.1 C0248 status itself is latest-row status, not canonicality proof
`private.c0248_planner_status_v01` selects the latest `fpl_sequential_planner_runs` row for GW/horizon by captured_at/id and exposes `shadow_only` and `production_selected`. This does not itself prove uniqueness of production selection or generation-valid canonicality.

### 3.2 C0240 status has an explicit final-ready contract
`private.c0240_adversarial_status_v01` only reports `final_ready=true` when the latest run is `STABLE_NO_MEANINGFUL_EDGE`, all 15 slot attacks are covered, >=8 structure attacks exist, and exact-horizon baseline, transfer-path, sensitivity and repeat-cycle coverage are all true. This is a real adversarial readiness contract, not merely the earlier C0233 red-team layer.

### 3.3 C0237 is a three-stage SQL publication chain
The live chain is:
1. `c0237_publish_current_fpl_plan_core_v01`
2. `c0237_publish_current_fpl_plan_pre_c0248_v01`
3. `c0237_publish_current_fpl_plan_v01`

Core requires a complete evaluated stack but selects many inputs as latest persisted rows by GW/horizon. Pre-C0248 requires C0227 uncertainty, C0240 final-adversarial lineage and C0242 consistency. V10 then overlays the C0248 selected path.

### 3.4 Final execution authorization is conjunctive
V10 computes execution authorization as:
`base execution_authorized AND C0248 selector_cutover_candidate_ready AND final_status = FINAL_AUTONOMOUS_DECISION`.
Post-deadline closure is rendered FINAL for audit but explicitly not retroactive execution authorization. This is a positive fail-closed property.

### 3.5 Publication is append-only, but current view is not canonical authority
The live mutation trigger blocks UPDATE/DELETE on `public.fpl_live_plan_publications`, preserving append-only evidence.
However `public.current_fpl_live_plan_v01` is simply `DISTINCT ON (gameweek)` ordered by `captured_at DESC, id DESC`. It is therefore latest-row serving, not generation-valid canonical authority. CP17/22/24 concerns are confirmed live.

## 4. P0 source-control/recovery finding
GitHub default-branch code search returned no indexed source matches for representative live SQL authority definitions including:
- `c0248_decision_control_status_v01`
- `c0248_promote_verified_candidate_v01`
- `c0240_orchestrate_v01`
- `c0240_adversarial_status_v01`
- `C0237_ALWAYS_LIVE_PLAN_V10_POST_DEADLINE_CLOSURE`

This is not sufficient to prove every definition is absent from every migration/document representation, but it is sufficient to classify the SQL control plane as **SOURCE_CONTROL_PARITY_UNPROVEN / P0 DISASTER-RECOVERY RISK**. We must not claim GitHub can currently reconstruct the production database authority layer.

## 5. Authority chain reconstructed
Current production authority flow is approximately:

`predictions + manager state + optimizer/supporting layers`
-> `C0240 final adversarial persisted run`
-> `C0242 consistency/captaincy controls`
-> `C0237 pre-C0248 publication`
-> `C0248 decision-control selected path / renderer`
-> `C0234 final gate authority`
-> `C0237 V10 immutable publication`
-> `current_fpl_live_plan_v01` latest-row serving
-> V3/public consumers.

Important distinction: C0248 selection and C0234 final authorization are separate authority dimensions. C0237 combines them for publication; the current view then loses generation-valid canonical semantics by serving whichever publication row is newest.

## 6. Red-team contradictions

### P0-A — SQL source recovery is now a first-class Pre-VPS blocker
Edge parity alone is insufficient. A clean rebuild from GitHub is not proven capable of recreating C0240/C0248/C0237 SQL authority behavior. Before VPS migration, every live authority function/view/trigger must have a canonical source-controlled definition and provenance.

### P0-B — latest-row joins can compose mixed generations
`c0237_publish_current_fpl_plan_core_v01` independently chooses latest manager, optimizer, ensemble, structural, forward, OR, red-team and gate rows. Later C0240 lineage checks reduce some mismatch risk, but this is still not the consumed-generation-vector architecture designed in CP33-36.

### P0-C — latest publication != current canonical recommendation
Append-only history is correct. `current_fpl_live_plan_v01` is not. A newer contested/stale/closure/republication row can become the served current row merely by chronology. Canonical publication authority needs an explicit authority revision/pointer or generation-valid resolver.

### P0-D — C0248 production-selected uniqueness remains unproven
The status helper reads latest planner row and exposes `production_selected`; prior audits already observed multiple rows can carry `production_selected=true`. Boolean state is insufficient canonical selector authority without uniqueness/CAS/revision semantics.

### P1 — semantic version identity spans Edge + SQL
The effective decision release is not one Edge deployment. It is a graph of Edge bundles, SQL functions, views, triggers, table constraints and persisted authority rows. Release manifests must version the whole graph.

## 7. What CP43 does NOT conclude
- It does not conclude the live SQL logic is wrong merely because GitHub parity is unproven.
- It does not authorize copying live SQL into migrations.
- It does not authorize changing `current_fpl_live_plan_v01`.
- It does not authorize selector promotion or planner production selection.
- It does not authorize deadline, settlement or manager-state repairs.
- It does not claim representative GitHub code-search misses prove every SQL definition is absent; exact migration-tree audit remains required.

## 8. Updated blocker/disposition matrix
- Edge source parity: mostly bounded/observed; one known unrecovered runtime-ahead adapter.
- CP39 recovered Edge source: two components pending equivalence proof.
- SQL authority source parity: **P0 UNPROVEN**.
- C0240 final adversarial authority: live and real; SQL-based.
- C0248 selector authority: live; canonical uniqueness/revision semantics unresolved.
- C0237 immutable evidence: live and protected.
- Current publication authority: **P0 latest-row semantic defect/unresolved design**.
- Official deadline authority: unresolved.
- Manager-state current-private authority: unresolved.
- Result settlement authority: unresolved.
- Semantic-generation consumed-vector architecture: unresolved.

## 9. Next bounded planning batch — CP44
Perform an exact migration/source-tree audit for the SQL authority graph and produce the consolidated release-recovery manifest:
1. enumerate source-controlled migrations/files for every C0240/C0248/C0234/C0237 live function/view/trigger;
2. classify each as MATCH_OBSERVED, LIVE_AHEAD, REPO_AHEAD, LIVE_ONLY, REPO_ONLY, DIVERGENT or UNPROVEN;
3. include table constraints/indexes/triggers required for authority invariants;
4. separate safe source recovery from behavior-changing semantic repairs;
5. produce a concrete Pre-VPS implementation sequence and approval packages, without implementing them.

## Decision
CP43 confirms the next major C0273 blocker is not another model layer: it is **reproducibility and canonicality of the SQL authority/control plane**. The live architecture contains meaningful fail-closed protections, especially C0240 readiness, C0248 selector gating, C0234 final authority and append-only C0237 publication. But GitHub reconstruction of that control plane is unproven, and latest-row publication serving remains semantically weaker than the intended canonical authority model.

**No production behavior changed. All source recovery, SQL/migration changes, deployments, runtime/model/schema/cron/API/UI changes, selector promotions, publication changes and FPL-account actions remain explicitly approval-gated.**