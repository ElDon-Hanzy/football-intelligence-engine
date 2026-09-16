# C0278 — Full Engine State Audit & Reconciliation — 2026-09-16

## Scope
This is a whole-project reconciliation, not a C0277-only audit. Live Supabase runtime/data/registry outranks documentation. Audit covered tracker portfolio, C0213 architecture/behavioral governance, current C0276 decision cycle, projection provenance/storage, active cron inventory, canonical GitHub docs, C0248 current lineage, recent C026x/C027x programs, and protected research/shadow decisions.

## Live architecture baseline
- C0213 registry integrity: true.
- Components: 816 total; 726 DB; 59 external.
- Dependency edges: 1,552.
- Required capabilities: 19/19 present; no contradictions.
- Production-effect components: 14.
- Behavioral proof: 13/14 current; `P4_PROJECTION_CORE_OUTPUT_LINEAGE` has historical PASS but definition hash no longer matches `private.generate_upcoming_fpl_projection_core_v01(p_gameweek integer,p_force boolean)`.
- Therefore `system_consolidation_ok=false` until the proof is deliberately re-run/diagnosed. Do not waive the definition-hash rule.
- Tracker consumption governance: 98/98 covered; zero violations.
- Active retired external deployments: zero.
- GW5 prediction-effect provenance: run 1393, 604/604 baseline/lambda/event/fixture lineage rows; status ok.
- Storage: 931 MB database; immutable forecast audit reports no frozen model prediction mutation.

## Tracker portfolio
199 tracker rows total. 163 are Completed/Verified. Remaining live portfolio includes blocked, monitoring, research-forward, deferred and active engineering work; these states are intentional unless separately adjudicated.

Important current dispositions:
- C0264: Blocked / Executed. Experimental latency branch/PR remains closed-unmerged; C0266/C0269 are the verified production reliability baseline.
- C0265: Open / Planned / Critical; production xMins behavior intentionally unchanged by explicit user decision.
- C0270: In Progress / Executing; shadow diagnostics only, frozen prospective definition.
- C0273: Open / Planned; broad autonomy/VPS program remains deferred at Pre-VPS stabilization. CP39 recovered two runtime-ahead Edge sources to GitHub, but full authority-relevant runtime/source parity manifest remains open.
- C0276: In Progress; bounded autonomous control plane is live, scheduler active every 5 minutes, current GW5 chain is READY through sequential candidate and intentionally blocked at FINAL_GATE until T-2. PUBLICATION remains stale; no external execution.
- C0277: Pending / Planned; seasonal chip option-value extension starts only after full-state handover.

Research/shadow portfolio remains governed: C0197 final prospective shootout/regime window through GW6; C0224 parity-draw shadow continues by explicit user decision; C0230 advisory/nonblocking; C0206 paused; C0265/C0270 unchanged.

## C0276 current decision lineage
Cycle 2, GW5:
- PLAYER_PROJECTION 1393 READY
- UNCERTAINTY 1393 READY
- OPTIMIZER 41 READY
- ENSEMBLE 16 READY
- STRUCTURAL 13 READY
- FORWARD 12 READY
- OR_UTILITY 14 READY
- RED_TEAM 14 READY
- ADVERSARIAL 24 READY
- CAPTAINCY 1393 READY
- SEQUENTIAL candidate 37 READY
- FINAL_GATE BLOCKED by `C0276_GOVERNED_BLOCK_FINAL_T_MINUS_2_GOVERNANCE`
- PUBLICATION STALE
- historical_forecasts_rewritten=false

C0276 autonomous cron is active at `*/5 * * * *`. C0240 concurrency was not expanded. C0265 behavior was not changed.

## C0248 lineage reconciliation
Latest GW5 candidate is run 37, shadow-only, V06 cutover candidate.
Run 36 is production_selected and its row-level `planner_version` is `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED`, but its embedded result JSON retains `result.planner_version=C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE` while result status is production selected. This is a real representation/consumer-binding inconsistency and is the leading P0 hypothesis behind chip-control `V06_PLANNER_RUN_MISSING`; do not alter promotion semantics merely to hide it.

## Chip control state
Current structural chip control has exact numerical evidence GW5-GW8 and structural-only evidence GW9-GW19. `season_best_chip_weeks_resolved=false`. Current C0248 chip/price/terminal/FH controls report `V06_PLANNER_RUN_MISSING`; C0276 bounded option-value reports `BOUNDED_OPTION_INPUT_NOT_READY`. Therefore raw current-Wildcard utility is not season-level chip authorization.

## Newly exposed reconciliation defects
### 1. C0274 untracked live runtime
A live private function family exists:
- `c0274_hard_event_invalidations_v01`
- `c0274_hard_event_invalidation_count_v01`
- `c0274_regenerate_hard_invalidated_gw_v01`

Active cron job 39, `c0274-gw6-hard-reprojection`, runs **every minute** and calls `private.c0274_regenerate_hard_invalidated_gw_v01(6)`. Recent executions succeed and currently return `NO_HARD_INVALIDATION` for GW6/run 1385. However:
- there is no `C0274` tracker row;
- GitHub code search found no current source/document reference for the live C0274 function;
- this violates the intended tracker/source-of-truth reconciliation standard even though the current no-op path is cheap.

This must be traced to its creation provenance, registered/documented or retired if obsolete, and its one-minute cadence justified. Do not delete it blindly: it is an active hard-invalidation safety path.

### 2. Canonical docs materially stale
- `PROJECT_STATE.md` is dated 2026-09-14 and stops at C0272; it does not describe C0273/C0276/C0277 or current run 1393/decision cycle.
- `PROJECT_DESCRIPTION.md` is dated 2026-09-11 and still says C0248 is shadow-only/not production-selected and C0240 is active normal-transfer authority; this is superseded.
- `SYSTEM_ARCHITECTURE.md` is dated 2026-09-11 and omits C0248 selected-path authority, C0276 autonomy, current captaincy/chip/finalization integration; its old 14/14 and component counts are stale.
- `WEEKLY_DATA_PIPELINE.md` is dated 2026-09-11 and still describes the pre-C0248 sequential-planner limitation and incomplete unified chip timing as current.
- `MODEL_REGISTRY.md` is newer (2026-09-14) but its 14/14 behavioral headline is now stale because current definition-bound proof is 13/14.
- `MODEL_CONSUMPTION_AUDIT.md` is a historical C0213 closure artifact and should remain historical, not be rewritten as if it were current; current status belongs in PROJECT_STATE/SYSTEM_ARCHITECTURE/MODEL_REGISTRY and a new audit record.

### 3. Legacy tracker lifecycle debt
Several old UI/model rows remain In Progress/Executed because their original close condition was device visual QA or forward evidence. They should not be mass-marked Completed from age alone. Examples: C0163-C0166, C0196/C0197, C0049. Reconcile each only with its explicit acceptance evidence; do not erase research history.

### 4. C0273 vs C0276 relationship
C0273 is the broader future autonomous website/engine/VPS architecture program. C0276 has since delivered a bounded Supabase-native FPL decision-cycle control plane. Documentation must state that C0276 satisfies a narrower current-FPL autonomy scope; it does not automatically close C0273's unresolved official-deadline, private-manager-state, settlement, public-authority/cache and future-hosting contracts.

## Cron audit
31 active crons are currently registered, plus one inactive bookmaker refresh. C0213 reports zero duplicate active cron targets. Exact cron inventory remains runtime state and should not be copied as a permanent static list. C0274 job 39 is the principal governance anomaly because it is live but untracked/unreconciled in GitHub.

## Safety / protected decisions
- Historical forecasts remain append-only.
- No frozen model predictions were rewritten.
- No FPL transfers or chips were executed.
- C0265 production behavior remains untouched.
- C0270 remains shadow-only.
- C0240 concurrency unchanged.
- FINAL publication remains blocked until the governed T-2 path permits it.
- Do not promote research from anecdotal/single-GW evidence.

## Required reconciliation sequence before new feature implementation
R0. Re-prove/diagnose the stale C0213 projection-core behavioral test; restore 14/14 only through valid evidence.
R1. Trace C0274 creation/source/provenance, register it in tracker/GitHub if valid, justify/adjust cadence only from evidence, or retire safely if obsolete.
R2. Reconcile canonical documentation to live C0248/C0276/C0277 architecture and current protected research dispositions.
R3. Build an authority-relevant runtime/source parity manifest extending C0273 CP39; verify deployed Edge versions/source hashes against GitHub for decision-critical functions before any rebuild/redeploy.
R4. Audit all active cron jobs for owner, purpose, lifecycle/tracker reference, completion semantics and overlap; preserve zero-duplicate-target invariant.
R5. Reconcile tracker lifecycle debt individually: close only where acceptance evidence exists; preserve monitoring/deferred/blocked states where intentional.
R6. Re-run tracker governance, C0213 architecture/behavioral/provenance/retirement/storage audits and current C0276 health after reconciliation.
R7. Only then begin C0277 P0 chip-option integration repair.

## Fresh-session rule
A fresh conversation must start with this whole-engine reconciliation sequence, not directly with C0277. Live runtime must be re-read because C0276 scheduler and upstream data can move after this audit.
