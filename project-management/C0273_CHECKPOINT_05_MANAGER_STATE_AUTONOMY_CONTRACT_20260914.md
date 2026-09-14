# C0273 — Checkpoint 05: Manager-State Autonomy Contract Audit

Date: 2026-09-14  
Program: Autonomous Website / Engine Control Plane  
Status: PLANNING / AUDIT ONLY  
Runtime effect: NONE  
Implementation authority: NOT GRANTED

## Objective

Determine whether the engine can autonomously know the canonical FPL manager state required by C0248 and downstream decisioning: owned 15-man squad, bank, free transfers, purchase prices / selling value, chip state and current-vs-locked account semantics.

This checkpoint changes no runtime, source, model, cron, database schema, Edge Function, website or FPL account state.

## Live evidence inspected

- live `public.fpl_manager_state_snapshots`;
- live cron inventory for manager-state refresh;
- deployed `sync-fpl-manager-state` v1;
- repository source for the same Edge Function;
- `private.c0213_p2_horizon_readiness_v02` manager-state readiness logic;
- live `public.fpl_actual_manager_decisions`;
- table indexing for `fpl_manager_state_snapshots`;
- current official 2026/27 FPL transfer/chip rules for banked free transfers.

## Critical finding 1 — current manager state is not autonomously refreshed

No active cron/job currently invokes `sync-fpl-manager-state`.

The durable manager-state table contains four rows only. The latest row is:

- `gameweek=4`;
- captured `2026-09-08 07:58:57 UTC`;
- `free_transfers=3`;
- `bank_tenths=0`;
- state provenance includes a **user confirmation** (`No transfers since GW3`).

There is no durable GW5 manager-state snapshot at this checkpoint.

Therefore current optimizer/account-state autonomy is not proven.

## Critical finding 2 — the current function cannot prove private pre-deadline account state unauthenticated

`sync-fpl-manager-state` calls:

- public bootstrap;
- public entry/history/transfer history;
- `transfers-latest`;
- `my-team/{entry}`;
- last locked public picks.

However, the function does **not** authenticate to the FPL user account. `my-team` is fetched but its payload is not consumed; only endpoint status is reported.

The function declares current visibility proven only when `transfers-latest` succeeds or target-Gameweek transfers are already visible through public transfer history. Official FPL public transfer-history behavior states that, when not logged in or viewing another manager, transfers are visible only up to the last deadline.

Planning implication: absent an authenticated/private integration, a manual transfer made during the current Gameweek can remain invisible until the deadline has passed.

This means there are two different state concepts that must never be conflated:

1. **LOCKED / OPENING BASELINE** — last officially locked squad plus post-deadline history. This can be reconstructed from public evidence.
2. **CURRENT PRIVATE ACCOUNT STATE** — current squad/bank/FT after transfers made since the last deadline. This is not generally provable from unauthenticated public evidence.

## Critical finding 3 — we have direct evidence of pre-deadline drift

The latest stored GW4 manager-state snapshot contained, among others:

- Mosquera;
- van Ewijk;
- Semenyo.

The verified locked GW4 actual submission later contained:

- Calafiori;
- De Cuyper;
- Foden.

The locked actual was captured separately from official post-deadline FPL picks.

Therefore the durable predeadline manager-state snapshot was materially stale relative to the account that actually reached the GW4 deadline.

This is the concrete failure mode C0273 must prevent. The engine must never describe a stale opening/account snapshot as current simply because its fields are non-null.

## Critical finding 4 — current readiness is completeness-light, not freshness-safe

`private.c0213_p2_horizon_readiness_v02` selects the latest manager-state row for the target Gameweek and declares manager readiness when these fields are non-null:

- state ID;
- free transfers;
- bank;
- acquisition squad cost;
- liquidation value.

It does not currently prove, as part of that readiness decision:

- manager-state freshness relative to the latest account mutation;
- source visibility mode;
- exact 15-player identity hash;
- 15/15 purchase-price evidence completeness;
- account-state generation;
- whether external/manual transfers occurred after capture;
- whether a Free Hit temporary squad is being mistaken for permanent ownership;
- whether the state was reconstructed only from public locked evidence.

For C0273, non-null manager fields are necessary but not sufficient.

## Critical finding 5 — current snapshot storage has no semantic uniqueness key

`fpl_manager_state_snapshots` has:

- primary-key uniqueness on `id`;
- a latest lookup index `(gameweek, captured_at desc, id desc)`;
- no unique semantic state/signature key.

The current Edge Function performs latest-signature deduplication in application logic. Concurrent equivalent writers could therefore still append duplicate semantic snapshots.

C0273 planning classification: **SINGLE_WRITER + RECONCILE / SEMANTIC-KEY REQUIRED** before autonomous controller dispatch.

## Positive finding — public evidence can support a strong opening baseline

After a deadline has passed, public locked picks and transfer history can provide a strong basis for the **next Gameweek opening state**.

The existing function already has useful reconstruction logic:

- locked 15-player picks;
- historical transfer sequence;
- transfer-in price when available;
- initial purchase-price evidence from the pre-first-price-change internal capture;
- current FPL player prices;
- bank reconstruction;
- free-transfer reconstruction;
- 15/15 internal player mapping requirement.

This is valuable and should be hardened rather than replaced.

## Current 2026/27 rule check

Official Premier League 2026/27 guidance states:

- up to five free transfers may be banked;
- Wildcard and Free Hit retain banked transfers;
- Free Hit restores the prior squad/bank state after the Gameweek.

The current FT reconstruction logic appears directionally compatible with retaining the pre-chip banked FT count, but C0273 must require fixture-independent unit tests against the current official rule set rather than treating historical chip behavior as permanent.

## Required Manager-State Authority Contract

### A. State lanes

The future controller must model separate lanes:

- `OPENING_LOCKED_BASELINE` — authoritative state derived from the previous locked deadline;
- `CURRENT_PRIVATE_STATE` — current account state after current-GW account mutations;
- `ENGINE_HYPOTHETICAL_STATE` — recommendation / candidate transfer state;
- `ACTUAL_SUBMITTED_STATE` — locked picks after the target deadline.

Permanent invariant:

`OPENING_LOCKED_BASELINE != CURRENT_PRIVATE_STATE != ENGINE_HYPOTHETICAL_STATE != ACTUAL_SUBMITTED_STATE`.

The engine recommendation must never be used to backfill or infer the actual account state.

### B. Canonical manager-state identity

A decision-eligible manager-state version must include at minimum:

- entry ID;
- target Gameweek;
- 15 ordered/unordered canonical player IDs plus squad hash;
- bank;
- free transfers;
- purchase price for all 15 permanent assets;
- computed selling value for all 15 permanent assets;
- chip availability/history;
- active chip for the target Gameweek if known;
- source visibility mode;
- known-at / captured-at;
- source evidence IDs/hash;
- `manager_state_generation`;
- semantic signature.

### C. Completeness invariant

`MANAGER_STATE_COMPLETE` requires:

- exactly 15 unique mapped players;
- legal FPL position composition and max-three-per-club constraints;
- bank known;
- FT count known under current-season rules;
- purchase-price evidence exact for all permanent assets;
- selling values deterministically reproducible;
- chip history/availability known;
- no unresolved contradictory account-state source;
- state lane explicitly identified;
- source evidence belongs to the current manager-state generation.

### D. Authority / freshness states

Proposed planning states:

- `OPENING_VERIFIED` — previous deadline's locked account state is completely reconstructed;
- `CURRENT_PRIVATE_VERIFIED` — authenticated/private evidence proves the current account state;
- `CURRENT_PRIVATE_UNOBSERVABLE` — opening state is known but post-deadline account mutations cannot be independently observed;
- `CURRENT_PRIVATE_STALE` — private state was once observed but freshness budget is exceeded;
- `CONTRADICTED` — sources disagree materially;
- `INCOMPLETE` — any required economic/squad field is missing.

These are authority states, not model confidence scores.

### E. Optimizer dispatch rule

For a recommendation-only autonomous product, optimizer dispatch may use `OPENING_VERIFIED` **only while the system can prove that no external/manual account mutation needs to be incorporated**.

If the user can make manual transfers outside the engine and the engine has no authenticated read path, current account state becomes `CURRENT_PRIVATE_UNOBSERVABLE`. The website must say so and must not silently treat the opening baseline as current.

For true autonomous account-aware operation, one of the following is eventually required:

1. provenance-safe authenticated FPL private-state read integration; or
2. a controlled execution adapter where every account mutation is made/recorded by the system and later reconciled against official locked state; or
3. explicit human account-state confirmation, which is **not** full autonomy.

C0273 does not choose or implement any of these yet.

### F. Mutation / generation invalidation

Any proven account mutation that changes squad, bank, FT availability, permanent purchase prices or chip state must:

1. create a new manager-state version;
2. increment `manager_state_generation`;
3. invalidate planner/gate/publication work tied to the prior manager generation;
4. preserve prior publications append-only;
5. rerun feasibility/decisioning under the new state if still before the official deadline.

Late stale workers must be prevented from publishing under an older manager-state generation.

### G. Free Hit / Wildcard semantics

Free Hit requires two simultaneous identities:

- permanent squad/economy that will return next Gameweek;
- temporary target-GW Free Hit squad/economy.

A Free Hit temporary squad must never overwrite permanent ownership/purchase-price state.

Wildcard changes the permanent squad but should preserve the current-season banked-transfer semantics defined by official rules. Chip-rule version must be explicit in lineage because FPL rules can change between seasons.

### H. Capture cadence design requirement

Planning target, not yet an implementation decision:

- capture/reconcile the new opening baseline immediately after official prior-GW state becomes publicly verifiable;
- refresh/reconcile current private state whenever a trusted private-state source reports a mutation;
- perform a final manager-state authority check before C0248 finalization and again at C0234/C0237 commit boundaries;
- do not invent a current state when only locked public data exists.

Exact polling cadence/resource budget remains to be measured.

## Red-team conclusions

### Failure scenario: user makes one manual transfer after the opening snapshot

Without private visibility, the engine can optimize the wrong squad, wrong bank and wrong remaining FT count while all model/projection data remains healthy.

Required response: `CURRENT_PRIVATE_UNOBSERVABLE` or authenticated reconciliation — never GREEN manager readiness.

### Failure scenario: transfer raises/lowers player selling value

Using current market price instead of acquisition-aware FPL selling value can make candidate paths falsely affordable/unaffordable.

Required response: exact purchase-price lineage for all permanent assets is part of manager-state completeness.

### Failure scenario: Free Hit active

Treating the temporary Free Hit squad as permanent corrupts next-GW ownership and purchase prices.

Required response: dual permanent/temporary squad lanes.

### Failure scenario: equivalent concurrent manager-state writers

Application-level latest-signature checks can race.

Required response: single writer/fencing plus semantic uniqueness/reconciliation contract.

### Failure scenario: stale state from same Gameweek remains non-null

Current readiness could classify it usable because required numeric fields exist.

Required response: readiness must consume authority/freshness/generation state, not only non-null fields.

## Updated autonomy boundary

C0273 should distinguish two product claims:

### Autonomous intelligence website

Can autonomously publish the best recommendation from a **verified decision baseline** and clearly expose when current private account state cannot be observed.

### Fully autonomous FPL account operator

Requires trusted current private account state plus an approved execution/reconciliation path. The current system does not satisfy this level and C0273 must not imply that it does.

The immediate C0273 target remains the first: an autonomous intelligence website/control plane, not autonomous transfer execution.

## Remaining open questions for user review

1. In a later implementation phase, should authenticated/private FPL account-state integration be in scope, or should C0273 intentionally remain recommendation-only?
2. If private integration is out of scope, should any manual account mutation force the website to show a permanent `ACCOUNT_STATE_NOT_VERIFIED` warning until the next deadline?
3. What credential/security boundary would be acceptable if private FPL account access is later approved?
4. Should the future product ever execute transfers/chips, or must execution remain permanently human-only?

These are deliberately unresolved and approval-gated.

## Current recommendation

**DO NOT IMPLEMENT YET.**

Manager-state autonomy is a P0 contract and must be resolved before controller implementation. The next planning batch should define result settlement/correction finality and then connect manager-state, deadline, result-settlement and source-readiness generations into one canonical Gameweek lifecycle contract.
