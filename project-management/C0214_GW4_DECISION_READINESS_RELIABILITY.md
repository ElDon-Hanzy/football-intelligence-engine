# C0214 — GW4 Decision-Readiness Reliability

Date: 2026-09-08
Status: Executed; awaiting latest-head CI before Verified closure.
Parent: C0213

## Objective

Repair the remaining post-C0213 GW4 readiness defects without changing frozen forecasts, fabricating missing state, or introducing an ad-hoc realized-role coefficient.

## 1. Realized-role identity reliability

### Defect
GW3 readiness reported 203/220 mapped starters even though 16 of the 17 source players already had verified FotMob→FPL identities. `ingest-realized-player-roles` ignored the canonical identity table and the P2 readiness counter inspected raw mapping status instead of the same canonical identity resolution used by the production role view.

The old observation hash also omitted mapping identity, so a later identity correction could not append a distinct corrected observation.

### Repair
Migration `20260907213140_c0214_realized_role_identity_contract_v01`:
- adds the missing verified Ezri Konsa identity (`FotMob 710159 → FPL player 27`);
- makes P2 realized-role readiness use `coalesce(raw player_id, current_fotmob_player_identities.player_id)`;
- adds `private.c0214_realized_role_identity_integrity_v01(gameweek)`;
- preserves missing-is-not-zero and `numeric_role_uplift_enabled=false`.

Edge Function `ingest-realized-player-roles` v2:
- prefers canonical identity observations at confidence >= 0.95;
- retains conservative name matching only as fallback;
- includes source identity, mapped player and mapping method in the append-only observation hash;
- does not change FPL classification or add a numeric role multiplier.

### Live proof
Forced GW3 refresh produced:
- expected starters: 220
- directly mapped starters: 220
- canonically resolved starters: 220
- unresolved source players: 0
- historical forecasts rewritten: false

## 2. C0167 MUN–MCI explanation integrity

### Defect
The final C0166 forecast for MUN–MCI was numerically populated and internally coherent, but the card layer returned no eligible explanation. The card generator materialized C0166 final evidence adjustments but omitted active parent C0159 signed inputs that remained part of the final C0166 forecast.

Relaxing the audit or inventing a City narrative was rejected.

### Repair
Migration `20260907213616_c0214_c0159_parent_explanation_bridge_v01` adds `private.c0214_add_parent_c0159_explanatory_candidates_v01(snapshot_run_id)` and wires it into the canonical C0162/C0166 fact refresh.

Only exact signed production inputs preserved in the final C0166 reason manifest are eligible:
- C0147 combined tactical input;
- recent attacking xG L10;
- opponent recent defensive xGA L10.

The helper writes explanation facts only. It does not alter lambdas, probabilities or score matrices.

### MUN–MCI live cards
1. `Man Utd have allowed 1.47 xGA/game across their last 10 league matches versus a 1.17 structural baseline, lifting Man City's scoring outlook.`
2. `The calibrated tactical matchup layer slightly suppresses Man Utd, favoring Man City.`

Both are signed inputs already present in the final production forecast.

### Audit proof
`private.c0167_decision_evidence_audit_v01(4)`:
- fixtures: 10
- categorical calls: 7
- no-clear-edge fixtures: 3
- hard violation fixtures: 0

`private.c0213_decision_readiness_v01(4)` is green at the projection/evidence layer.

## 3. Three-Gameweek horizon reconciliation

The refreshed player state invalidated older GW5/GW6 projection signatures as designed. P2 orchestration reconciled one stale Gameweek per transaction:
- GW4 run 1328: 604/604 projections/distributions
- GW5 run 1329: 604/604
- GW6 run 1330: 604/604
- ungoverned missing: 0 in all three
- projection horizon ready: true

A third orchestrator call returned `WAITING_FOR_MANAGER_STATE`.

This is the correct fail-closed state. GW4 manager bank/free-transfer/acquisition-state inputs are not yet captured, so the full-pool optimizer and manager plan must not be fabricated.

## 4. Integrity result

C0214 changes no frozen historical forecast and adds no numeric realized-role uplift. It repairs identity consumption, append-only correction semantics and explanation provenance only.

Current engineering readiness:
- GW3 realized-role coverage: 220/220
- GW4 C0166/C0167 evidence: green
- GW4–GW6 projection horizon: green
- remaining external gate: authoritative GW4 manager state
- full-pool optimizer: correctly waiting for manager state
- saved GW4 manager plan: not yet allowed

## 5. Advisor result

Post-DDL security and performance advisors showed only the pre-existing project backlog (RLS-with-no-policy informational findings, older mutable-search-path functions, `pg_net` in public, unindexed FKs and unused-index candidates). No new C0214-specific mutable-search-path or exposure finding was introduced.
