# C0273 Package A — Forensic Recovery Namespace

Date: 2026-09-15
Stage: A1 — forensic recovery namespace
Package: A
Production effect: NONE

> **NOT ORIGINAL GIT DEPLOYMENT COMMIT**
>
> **DO NOT REPLAY BLINDLY INTO PRODUCTION**

This directory contains forensic source-control snapshots of the live Supabase authority graph frozen by C0273 Package A. The artifacts preserve deployed evidence and provenance; they are not a claim that the recovered chronology is semantically correct, nor are they authorization to deploy, replay, repair, promote, or mutate production.

## Frozen direct scope

- 51 direct migration-ledger records whose names begin `c0234_`, `c0237_`, `c0240_`, or `c0248_` (1 / 7 / 16 / 27).
- 36 current private authority functions.
- `public.current_fpl_live_plan_v01`.
- 2 non-internal authority triggers.
- 4 principal persisted authority tables and 11 indexes represented as current-state inventory/manifest evidence.
- deployed `fpl-full-pool-optimizer` v15 adapter identity is frozen for A2 canonical source recovery.
- CP39 `refresh-current-player-state` v8 and `fpl-sequential-planner` v6 are equivalence-only and MUST NOT be overwritten.

## Evidence rules

1. Live Supabase evidence outranks stale documentation.
2. Ledger chronology and current catalog definitions are both retained because later migrations alter earlier objects.
3. Whitespace-normalized SQL definition fingerprints use `md5(regexp_replace(definition,'\\s+',' ','g'))`, matching CP45/A0.
4. Direct migration scope is prefix-based. A broader textual search returns 54 because it additionally captures three cross-family dependencies: `c0229_c0234_autonomy_run_storage`, `c0241_c0240_reuse_optimizer_horizon_guard`, and `c025x_c0240_infeasible_structure_semantics_fix`. They are dependency evidence, not members of the frozen 51 direct-family set.
5. Source parity does not prove semantic correctness. Known semantic issues remain Package B.

## Recovery layout

- `manifest.md` — frozen semantic inventory, identities, fingerprints and provenance.
- `ledger/` — exact applied migration-ledger recovery artifacts / index.
- `current/` — current catalog-definition recovery artifacts / index.
- `edge/` — runtime identity evidence. Canonical v15 adapter recovery occurs in A2, not A1.

## Hard stop contract

Any semantic/runtime difference, production dependency requiring mutation, CP39 overwrite risk, or Package B issue discovered during recovery stops Package A execution for review. No file in this namespace is production deployment authorization.
