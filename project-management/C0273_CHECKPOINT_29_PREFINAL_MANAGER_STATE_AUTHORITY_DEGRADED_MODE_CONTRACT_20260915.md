# C0273 — Checkpoint 29: PRE-FINAL Manager-State Authority & Degraded-Mode Contract

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 28 by resolving the most important prerequisite for a useful all-week PRE-FINAL lane: what manager state C0248 is allowed to optimize against when verified current private FPL account state is unavailable.

This checkpoint does not create a GW5 manager snapshot, run C0248, publish a recommendation, alter C0272, change APIs/UI, or authorize FPL account execution.

## 1. Live re-verification

Current durable `public.fpl_manager_state_snapshots` inspection for GW4/GW5 shows three GW4 rows and **zero GW5 rows**. The latest GW4 row is id 4, captured 2026-09-08 07:58:57 UTC, source `c0218_current_price_liquidation_refresh`; earlier GW4 rows explicitly combine public FPL API evidence with user confirmation.

Therefore Checkpoint 28's `OUTSIDE_FINAL_WINDOW` finding remains the immediate reason GW5 never reaches C0248 today, but once a PRE-FINAL controller exists, **GW5 manager-state authority becomes the next fail-closed prerequisite**.

Live C0248 rendering also confirms that the selected-plan renderer independently loads the latest manager-state snapshot for the target Gameweek and returns `MANAGER_STATE_MISSING` if none exists. This is a real semantic dependency, not merely documentation.

## 2. Critical distinction

The architecture must not collapse these states:

1. `OPENING_LOCKED_BASELINE` — previous deadline's verified locked squad, transformed only by deterministic game-rule carry-forward where valid.
2. `CURRENT_PRIVATE_STATE` — verified current account state including any manual transfers/chips made after the previous deadline.
3. `ENGINE_HYPOTHETICAL_STATE` — a planner-generated future state; never evidence of the user's real account.
4. `ACTUAL_SUBMITTED_STATE` — immutable postdeadline capture of what was actually submitted.

A public FPL endpoint may reveal the previous locked squad but cannot prove that no private predeadline transfer has subsequently occurred. Therefore `OPENING_LOCKED_BASELINE` must never be relabeled `CURRENT_PRIVATE_STATE` without authenticated/current evidence.

## 3. Target PRE-FINAL authority modes

The future PRE-FINAL controller should support explicit authority modes rather than a single ambiguous `manager_state_id` meaning.

### M1 — VERIFIED_CURRENT

Evidence: authenticated/current private account adapter or equivalent authoritative current-state source.

Allowed use:
- full C0248 PRE-FINAL planning;
- recommendation can be labelled current-account-aware;
- still non-executing unless a separately approved execution program exists.

### M2 — VERIFIED_OPENING_BASELINE

Evidence: immutable previous deadline actual/locked state plus deterministic carry-forward of bank/FT/chip state that is valid under known FPL rules, with no claim that manual postdeadline actions are absent.

Allowed use:
- C0248 may generate a **baseline-relative PRE-FINAL recommendation** for research/product usefulness;
- publication must prominently identify `manager_authority=OPENING_BASELINE_NOT_CURRENT_PRIVATE`;
- execution authorization = false;
- transfer path must be described as conditional on no unobserved manual account changes;
- this mode cannot silently upgrade to FINAL current-account authority.

### M3 — USER_CONFIRMED_CURRENT

Evidence: explicit recent user confirmation of current squad/transfers/chips combined with canonical prices/rules.

Allowed use:
- current-account-aware PRE-FINAL recommendation for a bounded freshness window;
- provenance and confirmation timestamp retained;
- expires/degrades when freshness policy says new manual actions may plausibly have occurred.

This remains human-dependent and therefore cannot satisfy full unattended autonomy, but it is semantically stronger than pretending the opening baseline is current.

### M4 — UNKNOWN_CURRENT

Evidence insufficient to establish either a valid baseline transition or current state.

Allowed use:
- no transfer recommendation claiming current feasibility;
- website should expose `CURRENT_MANAGER_STATE_UNVERIFIED` / no trustworthy current plan;
- engine may continue non-authoritative research calculations isolated from public decision authority.

## 4. Recommendation for the current architecture

Until an authenticated private-state adapter is explicitly approved and implemented, the safest useful autonomous product behavior is:

> Generate PRE-FINAL recommendations against a **verified opening baseline** when available, but label them as baseline-relative and non-executable; never claim they are synchronized to the user's current private account.

This gives the website useful all-week intelligence without fabricating authority.

However, this is only a planning recommendation. The current system has zero GW5 manager snapshot, so an implementation must first define a deterministic opening-baseline carry-forward contract rather than simply copying a GW4 row and changing `gameweek`.

## 5. Opening-baseline carry-forward contract

A future approved implementation may derive GW N opening baseline only from authoritative GW N-1 locked/actual evidence plus deterministic rule transitions.

Required fields/evidence include:

- exact 15-player squad;
- purchase/selling-price basis required for transfer feasibility;
- bank;
- free-transfer state and carry rule;
- chip availability/usage state;
- any game-rule reset or exceptional rule affecting the new GW;
- source actual-decision identity;
- derivation version;
- generated_at / effective_from;
- explicit `authority_class=OPENING_LOCKED_BASELINE`;
- `current_private_verified=false`.

The derivation must fail closed if any required economic/chip/FT state cannot be reconstructed without guessing.

## 6. C0248 consumption hardening required before PRE-FINAL activation

Current C0248 functions generally consume `manager_state_id`, but the type/authority/freshness semantics are not sufficiently first-class.

Future implementation should require C0248 input lineage to bind:

- manager state ID;
- manager authority class;
- observed/derived effective time;
- current-private verification boolean;
- derivation/source identity;
- bank/FT/chip-state completeness;
- freshness state.

A planner run must not become more authoritative than its manager-state input.

`planner_authority <= manager_state_authority`

This is a semantic invariant, not a numeric score.

## 7. Publication inheritance rule

C0237 PRE_FINAL publication must inherit the manager-state authority class without upgrading it.

Examples:

- `VERIFIED_CURRENT` → `PRE_FINAL_CURRENT_ACCOUNT_AWARE`
- `USER_CONFIRMED_CURRENT` → `PRE_FINAL_USER_CONFIRMED_CURRENT`
- `VERIFIED_OPENING_BASELINE` → `PRE_FINAL_BASELINE_RELATIVE`
- `UNKNOWN_CURRENT` → no trustworthy current recommendation publication

No PRE_FINAL mode authorizes FPL account execution under C0273.

FINAL publication should require its own stricter manager-state policy; this checkpoint does not decide that authenticated current private state can be waived for FINAL.

## 8. Red-team cases

### A — User manually transfers after the prior deadline

Opening-baseline planner becomes stale relative to reality.

Guard: baseline-relative label; no execution authority; authenticated/user-confirmed state supersedes baseline generation.

### B — User confirms squad but not bank/FT/chips

Squad identity alone is insufficient for legal C0248 planning.

Guard: manager-state completeness contract fails closed or publishes non-transfer research only.

### C — Baseline derivation copies current player prices instead of economic purchase/sell state

Transfer affordability may be wrong.

Guard: preserve purchase/selling-price lineage or fail closed.

### D — Planner renderer loads 'latest manager row' different from planner input

This can create mixed-lineage output even if the optimizer itself used a valid state.

Guard: renderer must eventually bind to the exact planner `manager_state_id`, not independently select latest-by-time. This is a newly highlighted lineage-hardening requirement; no change is made now.

### E — A new manager-state observation arrives after planning but before publication

Publishing the old plan as current would be stale-generation authority.

Guard: commit-time generation comparison and hard invalidation/replan according to Checkpoints 7/17/23.

### F — Baseline-relative plan looks polished and user assumes it is current

Guard: authority class must be product-visible, not buried only in lineage JSON.

## 9. New implementation-sized repair packages — NOT AUTHORIZED

### S2-R12 — Manager-state authority classification

Implement explicit authority class/completeness/freshness semantics for manager-state observations and derived opening baselines. This overlaps S1-R2 and should be implemented as one repair, not a duplicate subsystem.

### S2-R13 — Deterministic opening-baseline derivation

Derive GW N opening baseline from GW N-1 immutable actual/locked state only when bank/FT/chip/economic state is reconstructable. Never copy/rename a prior row blindly.

### S2-R14 — Exact planner/render/publication manager lineage

C0248 planner, renderer, C0234 and C0237 must consume/inherit the exact same manager-state authority identity. Remove independent 'latest manager state' selection from authority-sensitive rendering after approved migration.

## 10. Acceptance evidence

Before PRE-FINAL production activation:

- GW transition test reconstructs opening baseline exactly from prior locked evidence;
- missing bank/FT/chip/purchase-price evidence fails closed;
- simulated manual-current-state supersession invalidates baseline-relative currentness;
- C0248 planner and renderer prove identical manager_state_id lineage;
- publication cannot upgrade baseline-relative authority to current-private authority;
- manager-state change between plan and publish causes stale rejection/reconciliation;
- V3 visibly distinguishes baseline-relative from verified-current recommendations;
- no historical manager-state/decision/publication row is rewritten.

## 11. Contradictions / open questions preserved

1. Exact authenticated FPL/private-state acquisition method remains unresolved and approval-gated.
2. Exact freshness window for `USER_CONFIRMED_CURRENT` should not be guessed; it depends on event/update semantics and whether the user can act elsewhere.
3. Whether FINAL recommendation authority may ever use `VERIFIED_OPENING_BASELINE` rather than `VERIFIED_CURRENT` remains unresolved; default should be fail closed until explicitly decided.
4. Current C0248 selected-plan renderer independently selects latest manager state instead of binding the planner's exact manager_state_id; this is a lineage risk to repair, not historical evidence to rewrite.
5. Current GW5 has no manager-state row. This checkpoint deliberately does not create one.
6. S1-R2 and S2-R12 are the same semantic repair viewed from truth and orchestration layers; implementation must consolidate them rather than create parallel classifications.
7. Opening baseline can be useful for recommendation-only autonomy, but it does not solve unattended current-account synchronization.
8. FPL account execution remains outside current authorization.

## 12. Decision

C0273 adopts the planning contract that PRE-FINAL usefulness and manager-state truth can coexist through explicit authority degradation rather than fabricated currentness.

The target system may publish a baseline-relative PRE-FINAL plan when current private state is unverified, provided the baseline is deterministically reconstructable and the authority limitation is first-class. It must never present that plan as verified current-account state or execution-authorized.

A newly identified lineage issue is recorded: authority-sensitive C0248 rendering should eventually bind to the planner's exact manager_state_id instead of independently selecting the latest manager row.

No manager state is created, no planner is run, and no production behavior changes under this checkpoint.

**All production implementation remains explicitly approval-gated.**
