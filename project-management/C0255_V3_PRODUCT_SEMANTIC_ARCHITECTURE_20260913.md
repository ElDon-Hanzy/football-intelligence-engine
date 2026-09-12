# C0255 — V3 Product & Semantic Architecture

Date: 2026-09-13
Branch: `c0255-v3-product-semantic-architecture`
Status: IN PROGRESS

## Objective

Create `/v3/` as a new consumer football-intelligence product while preserving the existing engine, models, Supabase data, historical forecasts, governance and `/v2/` fallback.

V3 is not a V2 redesign. It gets a new product identity and a new serving/read-model boundary. Model behavior is out of scope unless a separately governed engine change is required.

## Non-negotiable invariants

1. `/v2/` remains operational and is not modified or retired during C0255.
2. Historical forecasts remain append-only.
3. No recommendation, UI state or publication may manufacture retrospective execution authority.
4. `publication_status = FINAL` does not imply `execution_authorized = true`.
5. A manager-state snapshot and a recommendation squad are never merged unless they describe the same semantic state and lineage.
6. The actual submitted FPL team is shown only when independently verified. Missing actual state is rendered as `ACTUAL_NOT_VERIFIED`.
7. Decision-time projections, price and ownership evidence retain their own capture timestamps and are never silently replaced by later live values.
8. Fixture state is explicit: `FUTURE`, `LIVE`, or `FINISHED`.
9. Once a fixture has started, its frozen pre-match probabilities are historical/frozen evidence, not a current actionable forecast.
10. Production runtime/source parity is a deployment gate for V3-facing serving contracts.

## Audit evidence at C0255 start

### Current GW4 truth

- C0237 publication id: 34.
- publication stage/status: `FINAL / FINAL`.
- final status: `FINAL_POST_DEADLINE_CLOSURE`.
- prediction run: 1365.
- `execution_authorized = false`.
- selected frozen scenario: `NAMED:GW4_3FT_GUEHI_GABRIEL_SCHADE`.
- no GW4 row exists in `public.fpl_actual_manager_decisions`.
- latest GW4 manager-state snapshot is pre-transfer: 3 FT, £0.0m bank.
- therefore the recommended post-transfer squad must not be presented as the verified manager squad and must not inherit the pre-transfer FT/bank values as though both were one state.

### Active Gameweek lifecycle

At audit time GW4 contained finished, live and future fixtures after the deadline. The correct lifecycle is therefore `POST_DEADLINE_ACTIVE`, not historical complete.

Lifecycle contract:

`PRE_DEADLINE -> POST_DEADLINE_ACTIVE -> GW_COMPLETE`

Transition rules:

- `PRE_DEADLINE`: current time is before the Gameweek deadline.
- `POST_DEADLINE_ACTIVE`: deadline has passed and at least one fixture is unfinished.
- `GW_COMPLETE`: deadline has passed and all fixtures are finished.

### Reproducibility drift

Production `fpl-api` is version 18 with deployed bundle hash `3f02d4e011a635e8cc2fa5edd9fbad5c1c0c95d6c087bcdda472ff309ac5b347`.

The repository `supabase/functions/fpl-api/index.ts` does not contain the full deployed v18 source and still contains older lifecycle behavior. The live runtime is preserved until source parity can be restored without regression.

Permanent C0255 rule: never resolve source/runtime drift by deploying an older repository copy over a newer correct runtime. Capture/reconcile the runtime first, then require parity before later public V3 deployment.

## V3 read model

V3 will consume a purpose-built workspace contract rather than reinterpret V2 API semantics in React.

### 1. `actual`

Represents only independently verified submitted manager state.

Required properties:

- `verification_status`: `VERIFIED | NOT_VERIFIED`;
- `source` and `captured_at` when verified;
- submitted squad/XI/bench/captain/vice/chip only when supported by evidence;
- manager FT/bank only when they belong to the same actual-state capture.

If evidence is absent, V3 returns an explicit `NOT_VERIFIED` state and no inferred squad.

### 2. `recommendation`

Represents the engine-selected hypothetical path.

Required properties:

- publication id/status/final status;
- `execution_authorized` as an independent boolean;
- prediction/planner/gate lineage;
- recommended transfers, squad, XI, bench, captain, vice and chip;
- post-action FT/bank only when derived from the same recommendation path;
- explicit `frozen_after_deadline` flag for post-deadline audit publications.

Display language:

- `FINAL + execution_authorized=true`: `Authorized final recommendation`.
- `FINAL + execution_authorized=false`: `Final frozen recommendation — not execution-authorized`.
- never call the second case an authorized plan.

### 3. `decision_snapshot`

Represents immutable evidence available to the decision at the relevant cutoff.

Includes:

- prediction run/model version;
- generated/captured/deadline timestamps;
- player xPts/xMins/tail probabilities;
- decision-time price and ownership snapshots where captured;
- source/provenance for every time-sensitive evidence family.

Current/live price or ownership must be a separate field and can never silently replace missing historical evidence.

### 4. `realized`

Represents live or final outcomes only.

Includes:

- fixture phase and live/final score;
- player minutes/points/stat lines when valid;
- result-run provenance;
- comparison against the frozen decision snapshot.

Realized evidence can annotate history but cannot mutate `decision_snapshot`.

## Composition rule

The V3 workspace may visually compare lanes but may not collapse them into one manager object.

Allowed comparisons:

- actual vs recommendation;
- recommendation vs ROLL/alternatives;
- frozen projection vs realized result;
- decision-time evidence vs explicitly labelled live/current evidence.

Forbidden merges:

- pre-transfer actual manager FT/bank + hypothetical post-transfer recommendation squad;
- engine recommendation + absent actual decision presented as current team;
- frozen pre-match probability + live score presented as one current forecast;
- decision-time xPts + later price/ownership without separate timestamp/source labels.

## Fixture semantics

Each fixture receives one phase:

- `FUTURE`: kickoff is in the future and fixture is unfinished;
- `LIVE`: kickoff has passed and fixture is unfinished;
- `FINISHED`: fixture is finished.

Presentation rules:

- `FUTURE`: may show `Upcoming` and actionable pre-match forecast when within the appropriate product context.
- `LIVE`: never label as `Next`; show live score/status first. Pre-match model becomes `Frozen pre-match forecast`.
- `FINISHED`: show final result and frozen forecast for audit/comparison only.

## FPL page information architecture

Primary view: pitch.

1. lifecycle/status bar;
2. state selector/comparison: `Engine recommendation`, `Actual team`, `Live/realized` as available;
3. reusable formation-aware `FplPitch`;
4. visually separate bench strip;
5. transfer/action summary;
6. captaincy and player evidence;
7. secondary `List View` toggle;
8. provenance/details below the consumer-facing decision layer.

`FplPitch` is presentation-pure. It receives a fully resolved semantic state and never decides which source is authoritative.

## V3 product identity

Working direction: light, editorial football product rather than engineering dashboard.

Design principles:

- light warm neutral page background;
- crisp white content surfaces;
- deep ink typography;
- pitch green as the primary football identity;
- electric blue reserved for model/intelligence cues;
- lime/high-energy accent used sparingly;
- no inherited dark navy/purple FIE visual system;
- generous spacing, rounded but not pill-heavy cards, consumer sports hierarchy;
- desktop top navigation and mobile bottom navigation;
- pitch remains the dominant FPL visual on all breakpoints.

Working navigation: `Home | FPL | Matches | Insights | History`.

## C0255 implementation checkpoints

### A — Semantic contract and reproducibility guard

- [x] independently audit live GW4 semantics;
- [x] confirm missing GW4 actual decision;
- [x] confirm FINAL does not imply authorization;
- [x] confirm pre-transfer manager state cannot represent recommended post-transfer state;
- [x] confirm active lifecycle has finished/live/future fixtures;
- [x] confirm repository/runtime drift;
- [ ] commit typed V3 state contract and regression tests;
- [ ] restore exact `fpl-api` runtime/source parity or establish a deterministic generated-source capture gate;
- [ ] add V3 serving-contract parity checks.

### B — V3 application shell/design system

- [ ] create isolated `frontend-v3/` application;
- [ ] establish tokens, typography, navigation, surfaces, spacing and responsive primitives;
- [ ] no dependency on V2 CSS/components.

### C — FPL workspace

- [ ] implement state-aware workspace shell;
- [ ] implement reusable formation-aware `FplPitch`;
- [ ] implement pitch/list toggle;
- [ ] implement separated bench;
- [ ] implement actual/recommendation/live comparison states.

### D — QA and deployment gate

Before public V3 serving:

- [ ] data-integrity tests green;
- [ ] semantic regression tests green;
- [ ] responsive mobile/tablet/desktop QA green;
- [ ] E2E green;
- [ ] repository/runtime source parity green;
- [ ] V2 unchanged and still live;
- [ ] live `/v3/` serving verified;
- [ ] historical forecasts rewritten = false.

## Regression requirements inherited from V2 defects

1. A recommended transferred-in player must resolve from the recommendation squad/full player pool, not only from the old actual squad.
2. `FINAL + execution_authorized=false` must never render `authorized`, `locked`, or equivalent language.
3. Risk labels must not encode authorization state.
4. FT/bank metrics must be state-scoped and lineage-scoped.
5. Missing actual submitted state must render `Actual submitted team not verified`.
6. Started fixtures must render `LIVE`, never `Next`.
7. Frozen decision-time projections must be labelled frozen/decision-time after deadline or kickoff.
8. V3 deployment must fail if the serving runtime and committed source contract are not reproducible.

## Model/governance impact

No model behavior change.
No optimizer/planner/gate weakening.
No historical rewrite.
No V2 retirement.
C0255 is product/serving semantics and frontend architecture only.
