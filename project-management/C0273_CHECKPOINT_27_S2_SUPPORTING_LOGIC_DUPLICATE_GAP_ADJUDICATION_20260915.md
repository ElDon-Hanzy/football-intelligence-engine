# C0273 — Checkpoint 27: S2 Supporting-Logic Duplicate / Gap Adjudication

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue the bounded S2 architecture-hygiene program after Checkpoint 26. This batch adjudicates three loose ends without changing production:

1. tactical matchup v0.1 versus v0.1.1 — true duplicate, wrapper, or contradictory authority;
2. C0207 transfer-driven teammate xMins/role redistribution — missing capability or duplicate of existing transfer/role machinery;
3. C0208 post-transfer set-piece/tactical hierarchy refresh — missing capability or duplicate of existing FPL/set-piece fields.

No function, schema, cron, model, source, frontend, tracker lifecycle, promotion, retirement or deployment behavior is changed.

## 1. Baseline re-read and tracker state

C0273 remains `Open / Planned / P0 / Pre-VPS Stabilization Planning`, model effect `None`.

Checkpoint 26 remains binding: C0248 is the sole intended canonical selected-path authority; C0213 full-pool optimizer is retained for now as a mandatory legacy prerequisite pending evidence for a future independent-challenger role. Production-effect governance must distinguish numeric, selection, blocking, publication, challenger, advisory and research effects.

C0207 and C0208 remain explicitly deferred research/implementation items, not production capabilities:

- C0207: `Transfer-driven teammate xMins and role redistribution`, status Open / Planned / Medium, phase `Deferred until additional EPL evidence accumulates`, model effect `Shadow first, production only after validation`.
- C0208: `Post-transfer set-piece and tactical-role hierarchy refresh`, status Open / Planned / Medium, same deferred phase, model effect `May affect future FPL projections after evidence gates`.

The existing deferral says not to execute transfer research until three additional completed EPL Gameweeks or earlier only for a concrete production integrity/coverage issue. This checkpoint does not override that decision.

## 2. Tactical v0.1 / v0.1.1 live adjudication

### 2.1 They are not two independent tactical models

Live definitions show:

- `refresh_fixture_tactical_matchups_v01()` is the base numeric generator. It constructs tactical matchup scores from team tactical profiles, expected-XI role features, replacement-quality evidence and opponent resistance; it inserts observations with `method=fixture_tactical_matchup_v0.1`.
- `refresh_fixture_tactical_matchups_v011()` immediately calls v0.1, reads the latest v0.1 rows, and inserts a calibrated representation with `method=fixture_tactical_matchup_v0.1.1`. The principal change is direction calibration (including ATTACK_LEAN / DEFENSIVE_LEAN bands); it does not independently recompute the underlying score.

Therefore the correct conceptual relationship is:

> **v0.1 = base score generator; v0.1.1 = canonical calibration/wrapper over v0.1.**

This is supporting composition, not legitimate competing-model duplication.

### 2.2 Registry intent already says this — but effect metadata is misleading

The live C0213 inventory currently classifies:

- v0.1.1: `PRODUCTION`, capability `TACTICAL_MATCHUP_REFRESH`, `CANONICAL`, `production_effect_enabled=true`;
- v0.1: `PRODUCTION`, same capability, `SUPPORTING`, canonical component v0.1.1, also `production_effect_enabled=true`.

Both rows carry `known_selector_timestamp_contradiction=true`.

The issue is therefore not that the registry failed to recognize canonical/supporting structure. The issue is that both functions are counted as separate production-effect components even though v0.1.1's semantic output depends on v0.1 and is the intended canonical entrypoint.

Future governance should treat this as one canonical tactical capability with an internal base-generator dependency unless a downstream consumer deliberately consumes raw v0.1 semantics.

### 2.3 Current selector behavior is structurally stronger than timestamp ordering

The live `current_fixture_tactical_matchups` view currently selects by:

1. method priority: v0.1.1 first;
2. then `captured_at DESC`;
3. then `id DESC`.

That means the current view definition explicitly prefers v0.1.1 even if a later raw v0.1 row exists. This is materially safer than pure latest-row timestamp selection.

However, the C0213 inventory still records `known_selector_timestamp_contradiction=true` and describes v0.1 as able to win latest-row timestamp ordering. This is now a **documentation/registry contradiction requiring reconciliation**, not evidence that the current view is presently timestamp-only.

### 2.4 Residual risk

v0.1 remains directly callable and marked production-effect-enabled. A caller bypassing the canonical v0.1.1 entrypoint could create raw observations without the calibrated companion until v0.1.1 next runs. The current view will prefer an existing v0.1.1 observation even when it is older, which can create a different freshness problem: canonical-method priority can hide a fresher base observation.

So the future contract should not be “always prefer v0.1.1 regardless of lineage.” It should be:

> **select the v0.1.1 calibration that is explicitly derived from the current canonical v0.1 base observation / generation.**

That is a lineage/freshness problem, not a reason to create another tactical model.

## 3. C0207 — transfer-driven teammate xMins / role redistribution

### 3.1 Existing capabilities do not close C0207

Live state proves transfer evidence exists:

- `player_transfer_events` exists;
- `private.c0205_transfer_status_v01()` currently reports 42 events across 29 players, 23 FPL-added events and 11 transfer-confirmed events;
- all 42 currently have `model_effect_enabled_events=0`.

There is also active role/tactical refresh infrastructure and current availability/xMins machinery.

But the inspected live routines expose no dedicated transfer-to-teammate redistribution routine. C0207's core requirement is causal propagation from an arrival/departure into **other players'** expected minutes, starting probabilities, role competition and uncertainty. Existing transfer capture plus ordinary role/xMins refresh does not prove that causal propagation exists.

### 3.2 Adjudication

C0207 is therefore best classified as:

> **REAL CAPABILITY GAP, NOT DUPLICATE — but correctly deferred.**

It should not be implemented merely because the gap exists. The existing deferral remains sensible because transfer-driven redistribution is highly assumption-sensitive and can degrade xMins if forced without post-transfer evidence.

### 3.3 Future boundary

When revisited, C0207 should not become a second xMins model. It should be a bounded evidence/event input to the canonical xMins/start-probability state:

- transfer event establishes a competition/role-change trigger;
- source/manager/observed-XI evidence determines confidence;
- canonical xMins machinery owns the resulting minutes state;
- unresolved hierarchy increases uncertainty rather than forcing minute conservation guesses.

This avoids duplicate authority.

## 4. C0208 — post-transfer set-piece / tactical hierarchy refresh

### 4.1 Some raw set-piece information already exists

Current live schema contains:

- `players.penalties_order` — populated for 61 of 659 current player rows;
- `players.corners_and_indirect_freekicks_order` — populated for 81 of 659;
- `player_role_intelligence.penalty_rank` and `set_piece_role`, but the inspected table currently contains only 2 rows, latest observed 2026-08-22;
- team tactical/set-piece scores used in tactical matchup evidence.

So C0208 is not a greenfield “we have no set-piece data” problem.

### 4.2 Existing data does not prove post-transfer hierarchy maintenance

The live routine inventory contains no dedicated post-transfer set-piece hierarchy refresh. Static/current FPL order fields can tell us what the provider currently exposes, but they do not by themselves prove:

- inherited order is invalidated when a taker leaves;
- a new arrival is incorporated into direct-FK/corner/penalty hierarchy with source-backed confidence;
- wide-side assignments or tactical-role hierarchy are refreshed;
- uncertainty is explicitly represented when hierarchy is unresolved;
- downstream consumers distinguish provider order from observed/manager-confirmed role.

### 4.3 Adjudication

C0208 is best classified as:

> **PARTIAL CAPABILITY GAP — existing raw fields overlap with part of the need, but automated post-transfer hierarchy reconciliation is not proven.**

It should remain deferred rather than spawning a duplicate set-piece model now.

### 4.4 Future boundary

When revisited, C0208 should be a reconciliation layer over existing canonical facts, not another independent hierarchy authority:

- FPL/provider set-piece order = one evidence source;
- observed taker behavior / manager evidence = higher-confidence evidence where governed;
- transfer events invalidate stale inherited hierarchy;
- canonical role/set-piece state records confidence and unresolved alternatives;
- projections consume only the canonical state according to existing evidence gates.

## 5. New contradiction discovered: current player registry count moved from 658 to 659

Checkpoint 24 documented 658 current registry players at its observation time. This batch's read-only query now sees 659 rows in `public.players`.

This is not treated as a defect: the upstream player universe can legitimately change through transfers/additions. It is useful evidence for the Checkpoint 24 recommendation that projection completeness must bind to a **versioned upstream player-universe observation**, not a permanently assumed count.

No historical completeness result is rewritten.

## 6. Red-team

### Failure A — retire v0.1 because v0.1.1 is canonical

v0.1.1 calls v0.1 directly. Removing v0.1 would break the canonical wrapper.

**Guard:** classify v0.1 as internal supporting generator unless/until the implementation is deliberately refactored.

### Failure B — count both tactical functions as independent model evidence

This inflates production-effect coverage and can make a wrapper look like independent validation.

**Guard:** capability-level behavioral coverage should understand canonical/internal dependency structure.

### Failure C — always prefer v0.1.1 by method regardless of base lineage

An old calibrated row can outrank a newer raw base row.

**Guard:** canonical calibration must bind to exact base observation/generation and freshness.

### Failure D — implement C0207 as a second xMins engine

Transfer logic could fight the canonical xMins model and double-count role changes.

**Guard:** transfer redistribution is a governed trigger/input into canonical xMins state, not separate minutes authority.

### Failure E — implement C0208 as another set-piece truth table

This would duplicate provider order, observed role evidence and role intelligence.

**Guard:** use reconciliation/invalidation semantics over existing evidence sources.

### Failure F — infer missing hierarchy as zero/no-role

Sparse set-piece-role coverage could silently suppress real takers.

**Guard:** missing remains unknown; uncertainty is explicit.

### Failure G — freeze projection-universe expected count

The move from 658 to 659 players demonstrates why a fixed count is unsafe.

**Guard:** completeness reconciles exact IDs to a versioned source observation.

## 7. Planning repair dossiers — NOT AUTHORIZED

### S2-R11 — Tactical canonical lineage closure

Future implementation should:

- preserve v0.1 as supporting base generator;
- preserve v0.1.1 as canonical calibrated representation/entrypoint;
- bind v0.1.1 to exact source v0.1 observation/generation;
- make current selector choose current canonical calibration by lineage + freshness, not method priority alone;
- reconcile stale C0213 `known_selector_timestamp_contradiction` metadata with actual current selector behavior;
- ensure behavioral coverage does not misrepresent wrapper + base as independent models.

### S2-R12 — C0207 capability boundary specification

Before eventual research resumes, document transfer event -> competition trigger -> canonical xMins/start-probability update semantics, uncertainty rules and non-double-counting tests. Do not activate model effect without the already-required evidence gate.

### S2-R13 — C0208 reconciliation boundary specification

Before eventual research resumes, define source precedence, transfer invalidation, confidence/unknown semantics and downstream canonical role/set-piece consumer. Reuse existing FPL order fields rather than creating duplicate raw truth.

## 8. Open questions preserved

1. Which current downstream functions consume `current_fixture_tactical_matchups` versus raw `fixture_tactical_matchup_observations` directly? Exact consumer map should be proven before any tactical cleanup.
2. Should v0.1.1 remain a persisted second observation or eventually become a deterministic calibrated projection/view over one base observation? No implementation choice is made here.
3. How should canonical tactical freshness behave when a new v0.1 base exists but its v0.1.1 calibration failed? Fail closed, expose raw as degraded, or retain previous calibrated evidence? Requires policy decision with consumer impact.
4. Does the current role/xMins refresh indirectly react to transfers through changed provider/player state strongly enough that some C0207 scenarios are already covered? This requires behavioral cases, not code-name inference.
5. Which provider fields are the actual production source of penalty hierarchy today, and are corners/direct FK consumed numerically or only stored? Earlier C0273 source audit found penalty hierarchy consumed but general direct-FK/corner consumption not proven.
6. C0207/C0208 remain deferred until additional EPL evidence; this checkpoint does not decide when their evidence threshold is met.
7. The 659-player registry observation needs reconciliation with current projection coverage in a later completeness refresh; no claim is made here that the latest projection run already covers the newly observed player.
8. C0213 production-effect accounting should eventually avoid treating a canonical wrapper and its required internal base generator as independent validation, but exact backwards-compatible registry semantics remain open.

## 9. Decision

Planning adjudication:

- tactical v0.1 and v0.1.1 are **supporting base + canonical calibration**, not competing independent models;
- the previously recorded timestamp-selector contradiction is stale/incomplete relative to the current view definition, but a lineage/freshness ambiguity remains;
- C0207 is a **real but deferred capability gap**, not duplicate logic;
- C0208 is a **partial/deferred capability gap** with substantial existing raw-data overlap; future work should reconcile existing evidence rather than create another hierarchy authority;
- the player-universe count changing from 658 to 659 reinforces versioned exact-ID completeness contracts.

No cleanup is implemented under this checkpoint.

**Production changes remain explicitly approval-gated. DO NOT IMPLEMENT, DEPLOY, ALTER RUNTIME/MODEL BEHAVIOR, PROMOTE, RETIRE OR KILL ANYTHING.**
