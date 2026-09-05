# C0213 Conversation Handover — Architecture Consolidation

Date: 2026-09-05 (Dubai)
Repository: `ElDon-Hanzy/football-intelligence-engine`
Supabase project: `knooiwezzsxcwhtjtdap`

## 1. Immediate user decision

No FPL squad changes are to be made before GW3 is fully complete.

The next engineering priority is **C0213 — Full Engine Architecture & Model-Consumption Audit / Architecture-Consolidation Program**.

New feature/model-family development should pause during the audit, except for:
- production reliability fixes;
- required data/result ingestion;
- already-frozen forward experiments/evaluators;
- integrity/security fixes.

Do not use the audit as an excuse to rewrite frozen historical FPL or betting forecasts.

## 2. Why C0213 is required

The De Cuyper role incident exposed a structural governance problem rather than a single bad player label.

C0212 correctly added realized competitive tactical roles from FotMob formation/lineup coordinates and separated:
1. FPL scoring position; and
2. actual tactical role.

However, a subsequent production-path audit found that the main FPL goal/assist projection functions still read an older `role_attack_multiplier` from the active v0.1.3 baseline prediction generated on 2026-08-22. For De Cuyper, O'Reilly, Gakpo, Tavernier, Cherki and Neco Williams that multiplier remained `1.00` even though current realized tactical roles had changed.

Therefore:
- factual role state exists and is correct;
- tactical/role snapshots can consume it contextually;
- but the production xG/xA/xPts path does **not yet prove a numerical realized-role effect**.

This is exactly the class of failure C0213 must detect automatically: **implemented data/model intelligence that exists but is not actually consumed by a production decision path**.

## 3. C0212 state to preserve

C0212 is Completed / Verified as a factual-state reliability fix.

Verified production state:
- `public.realized_player_role_observations` append-only;
- FotMob identity layer persistent;
- 27 completed matches backfilled at implementation time;
- 594/594 starter-role observations identity-resolved;
- 0 unresolved mappings;
- 272 players with realized-role state;
- realized-role cron active: `football_intelligence_realized_role_refresh`, schedule `37 * * * *`;
- current player state refreshed after new realized roles;
- future role/tactical snapshots consume corrected role state;
- historical forecasts rewritten: false;
- numeric role uplift remains unvalidated/disabled.

Four-player proof at implementation time:
- De Cuyper: FPL DEF, realized `WIDE_ATTACKER` in GW1/GW2/GW3, 3/3 role stability;
- Tavernier: `WIDE_ATTACKER`, 3/3;
- Gakpo: `WIDE_ATTACKER`, 3/3;
- Cherki: `CREATOR_10` in both league starts;
- Neco Williams: `WING_BACK`, 3/3;
- O'Reilly: GW1 `CREATOR_10`, GW2 `HOLDING_MIDFIELDER`, GW3 warm-up withdrawal/injury.

Do not hard-code player-specific tactical roles. The realized-role pipeline must remain generic and regularly refreshed.

## 4. Concrete structural warning signs already found

### A. Production consumption gap

`private.fpl_fixture_goal_lambda_v02()` and `private.fpl_fixture_assist_lambda_v02()` read `role_attack_multiplier` from an active-model prediction feature rather than directly proving use of the newest realized tactical role.

The active model remains `0.1.3`, created 2026-08-22. The relevant stored role multipliers inspected on 2026-09-05 were still `1.00`.

A component being present in `player_state` or a research/tactical table is therefore not proof that the production FPL prediction uses it.

### B. Layered legacy production entrypoint

`private.generate_upcoming_fpl_snapshot_v01()` currently delegates to `private.generate_upcoming_fpl_snapshot_c0160_legacy_v01()` after C0204 projection-coverage gating.

The audit must determine the true canonical implementation for each capability and whether legacy wrappers/versions remain necessary.

### C. Cron/orchestration complexity

At audit start there were 24 active cron jobs. Several responsibilities are independently scheduled. Example: competitive-core ingestion appears in more than one cadence, while player state, role/tactical state, team state, fixture forecasts, enriched forecasts and upcoming FPL snapshots are refreshed by different jobs.

The audit must test ordering, freshness dependencies, race/staleness risk and idempotency. The desired end state is one auditable decision-readiness cycle even if multiple underlying cron triggers remain.

### D. Documentation drift

Live tracker had 139 rows through C0212 while `PROJECT_STATE.md` still showed an older 2026-08-26 state with latest engineering ID C0137.

Supabase execution truth remains authoritative, then GitHub implementation artifacts, then handover/history documents. Do not blindly trust filenames such as CURRENT.

### E. Delivery governance is not consumption governance

`private.audit_change_tracker_governance_v01()` was green (139 rows, zero violations), but it verifies delivery/stage/reference discipline rather than proving that a built intelligence layer affects a live decision.

A new consumption-governance layer is required.

## 5. Cross-conversation memory findings that must inform C0213

A project-memory search across prior Fantasy EPL / Football Intelligence Engine conversations surfaced these durable lessons:

1. On 2026-08-30 the user had already identified that the platform was becoming large and likely contained duplicate/obsolete implementations. The requested remedy was to map the whole system, establish one canonical implementation per capability, identify duplicates/obsolete versions, and prove what production calls.

2. Previous architecture/process guidance already required auditing:
   - data ingestion and freshness;
   - feature engineering;
   - projections/xPts;
   - tactical matchup;
   - expected XI/role;
   - captaincy/haul;
   - lineup optimization;
   - decision snapshots;
   - API/dashboard;
   - scheduled jobs/orchestration.

3. Repeated project lesson: **implemented/verified is not the same as production-connected**. Multiple research features were intentionally built with no active forecast connection or `model_effect_enabled=false`. These are valid only when clearly classified as research/shadow and paired with an evaluator/promotion gate.

4. Historical chronology discipline is immutable:
   - historical predictions append-only;
   - no post-result rewrite;
   - genuine pre-kickoff intelligence distinct from retrospective replay/shadow work;
   - missing data is not zero;
   - no late-state contamination;
   - frozen A0005/W0002/E0007 definitions/cohorts remain frozen.

5. C0204 exposed another architecture class failure: active FPL players could disappear from the projection universe through an inner-join/coverage gap. Silent omissions must block snapshots; coverage audits are append-only.

6. C0135 exposed a missing-upstream-layer problem: the API could be correct while no reliable upcoming-GW snapshot existed. The correct fix was scheduler/orchestration coverage, not weakening the API.

7. Stale tracker/status/documentation has occurred before. Reconcile truth in this order: live Supabase execution/integrity, GitHub code/migrations, handover/history, local tracker artifacts.

8. Research models that failed or remained unvalidated must not be promoted merely because they exist. Examples include venue context, hierarchical residuals, nonlinear curves, mismatch mixtures and several tactical/replacement families.

9. User's permanent objective remains OR #1 FPL probability. The architecture audit must therefore optimize decision quality, not architectural elegance for its own sake.

## 6. C0213 audit objective

For every meaningful component in the Football Intelligence Engine, prove the complete path:

`SOURCE -> INGESTION -> RAW/CANONICAL DATA -> FEATURE/STATE -> MODEL/TRANSFORM -> PROJECTION -> DISTRIBUTION -> OPTIMIZER -> DECISION SNAPSHOT -> API/UI`

For research components the valid path is instead:

`SOURCE -> FEATURE/MODEL -> SHADOW OUTPUT -> EVALUATOR -> PROMOTION/REJECTION GATE`

Every component must end with exactly one lifecycle classification:
- `PRODUCTION`;
- `SHADOW`;
- `RESEARCH`;
- `UI_ONLY`;
- `INFRASTRUCTURE`;
- `RETIRED`.

No ambiguous 'implemented somewhere' state is acceptable.

## 7. Required C0213 workstreams

### 7.1 Complete machine-readable inventory
Inventory every:
- source/provider;
- ingestion job/function;
- raw table;
- canonical table/view;
- feature/state table/view;
- model version;
- SQL/edge-function transform;
- projection/distribution function;
- optimizer/captaincy function;
- decision snapshot;
- API;
- UI consumer;
- cron/orchestrator;
- evaluator/validation function;
- tracker item.

Record owner/canonical implementation, lifecycle status, inputs, outputs, last refresh, production consumer and model/decision effect.

### 7.2 Code-derived dependency graph
Build dependency edges from actual SQL/function/code references, not documentation claims.

For each node answer:
- who writes this?;
- who reads this?;
- which production or research path consumes it?;
- does it affect xMin/xG/xA/xPts/distribution/optimizer/captaincy/decision?;
- what is the final user-facing consumer?;
- is there a duplicate/legacy alternative?;
- can it be retired safely?

### 7.3 Behavioral model-consumption tests
Static references are insufficient.

For every production factor, perturb the factor in an isolated shadow/test context and prove the expected downstream output changes in the correct direction. Include at minimum:
- expected minutes;
- start/appearance probabilities;
- actual tactical role;
- injuries/availability;
- xG/xA/current-season player evidence;
- penalties;
- set pieces;
- team attacking/defensive strength;
- clean-sheet probability;
- defensive contributions;
- bonus;
- fixture/tactical adjustments that claim production effect;
- captaincy/haul distributions;
- squad optimizer constraints and marginal-value logic.

If a factor does not change the claimed downstream variable, classify it as unused/context-only/research and do not describe it as production intelligence.

### 7.4 Canonical orchestration / decision-readiness contract
Create one auditable refresh cycle with stage lineage, for example:

`RESULTS -> CURRENT DATA -> PLAYER ROLES -> PLAYER STATE -> TEAM STATE -> FIXTURE STATE -> PROJECTIONS -> DISTRIBUTIONS -> OPTIMIZER -> DECISION SNAPSHOT`

Every stage must record:
- cycle/run ID;
- upstream dependency timestamps/IDs;
- started/completed/failed;
- freshness state;
- row/coverage counts;
- integrity checks.

A decision snapshot must fail closed if a required production dependency is stale/missing.

### 7.5 Prediction-level effect provenance
Every future production prediction should expose a manifest of what actually affected it, including versions/timestamps and whether each family was enabled.

Do not confuse 'data exists' with 'data affected this prediction'.

### 7.6 Stronger tracker governance
For model/data-intelligence items, Completed/Verified should eventually require one of:
1. production-consumed and behavioral-effect test passed;
2. research/shadow with evaluator + promotion gate;
3. explicitly rejected/retired with preserved evidence.

An implemented model with no consumer and no evaluator should become a governance violation.

### 7.7 Canonical documentation
Produce/refresh at minimum:
- `SYSTEM_ARCHITECTURE.md`;
- `MODEL_REGISTRY.md`;
- `WEEKLY_DATA_PIPELINE.md`;
- `MODEL_CONSUMPTION_AUDIT.md`;
- a Mermaid dependency graph;
- a list of canonical implementations and deprecated/duplicate components;
- update `PROJECT_STATE.md` only after reconciling live production truth.

Where practical, generate documentation from the machine-readable registry instead of manually duplicating state.

## 8. Definition of done for production intelligence after C0213

A production model/intelligence family is not 'implemented' merely because it computes something.

Required chain:

`DATA EXISTS -> TRANSFORMATION VERIFIED -> PRODUCTION CONSUMER VERIFIED -> BEHAVIORAL EFFECT VERIFIED -> OPTIMIZER/DECISION CONSUMPTION VERIFIED -> PROVENANCE RECORDED`

If any arrow is missing, it is not part of the production decision model.

Research/shadow work is valid without production effect only when explicitly classified and attached to an evaluator/promotion or rejection gate.

## 9. Audit operating rules

- Do not refactor/delete first. Map and prove dependencies first.
- Do not assume handover docs are current.
- Do not blindly trust tracker stage labels.
- Independently inspect GitHub and Supabase.
- Run `private.audit_change_tracker_governance_v01()` before material changes.
- Inspect A0005 and W0002 status/integrity before touching shared model/data paths.
- Preserve all frozen historical forecasts, cohorts, experiments and decision history.
- Missing data is not zero.
- No same-cohort outcome-driven retuning.
- Separate production, research, retrospective and UI-only semantics.
- Do not add new model families during the audit.
- Prefer simplification and one canonical implementation per capability.
- Do not delete a legacy component until production dependency proof says it is safe.
- Record every architecture decision under C0213 with implementation/decision references.

## 10. First sequence in the fresh conversation

1. Read:
   - `PROJECT_STATE.md`;
   - `DECISIONS_AND_HISTORY.md`;
   - `project-management/C0213_CONVERSATION_HANDOVER_20260905.md`;
   - `project-management/C0212_REALIZED_PLAYER_ROLE_REFRESH.md`.
2. Independently inspect GitHub current state.
3. Query the full `public.change_tracker_working`, especially C0135/C0136/C0147/C0159/C0160/C0178/C0202-C0213.
4. Run `private.audit_change_tracker_governance_v01()` and frozen-cohort status/integrity checks.
5. Inventory all active pg_cron jobs and all active model versions.
6. Trace the current production FPL entrypoint from `private.generate_upcoming_fpl_snapshot_v01()` down to player/team/fixture inputs.
7. Build the first architecture inventory/dependency map **before changing production behavior**.
8. Identify and classify orphaned models, shadow-only models, duplicate implementations, stale wrappers, sequencing risks and undocumented live dependencies.
9. Present the initial audit findings and proposed consolidation order before destructive/refactor work.

## 11. Known immediate proof case for C0213

Use realized tactical role as the first model-consumption test.

Current factual state:
- De Cuyper current realized role = `WIDE_ATTACKER`;
- O'Reilly current realized role after GW2 = `HOLDING_MIDFIELDER`;
- Gakpo/Tavernier = `WIDE_ATTACKER`;
- Cherki = `CREATOR_10`;
- Neco Williams = `WING_BACK`.

Current production projection feature inspected on 2026-09-05:
- active v0.1.3 role attack multipliers for these players remained `1.00` from 2026-08-22.

C0213 must determine exactly whether/how realized tactical role should feed xMin/xG/xA/xPts, without inventing an unvalidated arbitrary uplift. The immediate audit goal is **prove the current consumption path**, not force a coefficient.

## 12. Final handover note

The engine has substantial high-quality integrity infrastructure, chronology discipline, research gating and data provenance. C0213 is not a rebuild from zero. It is a consolidation program intended to make the real production graph explicit, eliminate ambiguity, stop unused-model accumulation, and make every future recommendation auditable back to the exact intelligence that affected it.
