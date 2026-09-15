# C0273 — Checkpoint 45: Package A Source-Recovery Specification

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Mode: PLANNING / READ-ONLY FORENSIC SPECIFICATION
Production effect: NONE

## Authorization boundary
This checkpoint specifies Package A only. No live SQL/migration/schema/trigger/Edge/runtime/model/cron/API/UI/publication/selector/FPL-account behavior was changed. No source recovery was applied. All production changes remain explicitly approval-gated.

## Executive result
CP44 proved production-ahead SQL source drift. CP45 converts that finding into a bounded recovery specification with concrete evidence fingerprints and acceptance gates.

Package A remains a **reproducibility/source-recovery operation with zero intended production semantic change**. Package B semantic repairs remain excluded.

## 1. Tracker continuity check
Live `public.change_tracker_working` still records C0273 as Open / Planned / P0 / Pre-VPS Stabilization Planning with model effect `None. Planning/documentation only; zero runtime/model effect.` Its `implementation_refs` currently stop at CP39/recovery commits. Therefore CP40-CP45 documentation linkage is itself stale governance metadata and should be reconciled as documentation-only bookkeeping before C0273 closure. This does not authorize a tracker write in this checkpoint.

## 2. Migration-ledger recovery fingerprints
Read-only hashing of the live `supabase_migrations.schema_migrations.statements[]` establishes a stable evidence fingerprint per authority migration. Every direct C0234/C0237/C0240/C0248 migration currently has exactly one ledger statement entry.

Representative ledger hashes:
- C0234 `20260908213853 c0234_c0213_readiness_bridge` -> `75ed99c762b934cc9fae92918e2ed260`
- C0237 initial publication -> `b2f890eede0a52ccc0836174ca5c6484`
- C0237 complete-lineage v02 -> `1358c52e400d7390f8aad0ca2878d011`
- C0240 final adversarial evidence -> `16fad589b688b92a34a15081ec6b7467`
- C0240 incremental orchestrator -> `1d27e32c11bc5a096ac7c6652533714f`
- C0240 exact slot/path search -> `d7996a1e3da52b55ab751800e7ce57ee`
- C0240 closeout regression -> `6f9bb4ec8d5095ba5f37297d51192801`
- C0248 planner storage/status -> `8339f8cff8cbe61a8fbbd0ba985a7ff2`
- C0248 decision-control status -> `d6f6c387ec0ac4b04fd9e71a72e4a4a2`
- C0248 selected-path publication cutover -> `c91bb11ddda8269561cf6cbb253eb6d8`
- C0248 verified-candidate promotion -> `7d97842d415013ca9b01622d750d883d`
- C0248 fail-closed promotion bridge -> `9d1dce02c9451d0ac93ada0b6dbc3614`
- C0237 post-deadline closure -> `9e68a67d04db623725ce2b01123c9022`

The complete ledger-hash inventory should be materialized into the eventual recovery manifest, not hand-transcribed into reconstructed historical commits.

## 3. Current live-object normalized fingerprints
Whitespace-normalized current definitions were hashed read-only. These hashes fingerprint the **current live object state**, not the historical migration text.

Critical current hashes:
- private.c0234_autonomous_gate_status_v01 -> `f8849e714d253c847d3b9500fcd59b0c`
- private.c0237_publish_current_fpl_plan_core_v01 -> `4102bbc3579050089b1f791b5e906220`
- private.c0237_publish_current_fpl_plan_pre_c0248_v01 -> `2ef840562c4e95767480267652494d5f`
- private.c0237_publish_current_fpl_plan_v01 -> `9934bd4335bee424de2a1525b56ffa71`
- private.c0240_adversarial_status_v01 -> `23f694b75b195397619a33aea51347d0`
- private.c0240_orchestrate_v01 -> `03b0b608e0aa8222ac17776de23f8826`
- private.c0240_finalize_v01 -> `d55e89dbd62fe0a98e98f0168dd384e6`
- private.c0248_planner_status_v01 -> `c682d92b91f388746cd8520ceb504682`
- private.c0248_decision_control_status_v01 -> `511b7d55f770ee6c0c431aec8b634de8`
- private.c0248_production_selector_status_v01 -> `3cde6f22c634c91893c0e2a50c2cf279`
- private.c0248_promote_verified_candidate_v01 -> `209643bfb62e7b13ec99836241dda858`
- private.c0248_render_selected_current_plan_v01 -> `878f012944ca1df1b0f20073445a2e3c`
- public.current_fpl_live_plan_v01 -> `4aab3801992b9a8d42e9d1287d0ea36c`

The live inventory also contains the full C0240 orchestration family, C0248 option/chip/price helpers and public bridge functions. Package A must fingerprint all authority-relevant objects, not only these headline objects.

## 4. Recovery artifact layout
Package A should create source-controlled recovery artifacts in a clearly forensic namespace rather than pretending they were original historical migrations.

Recommended layout:
- `supabase/recovery/c0273/ledger/` — exact extracted ledger statements, named by original live migration version/name;
- `supabase/recovery/c0273/current/` — canonical current object definitions needed to reconstruct the authority graph;
- `supabase/recovery/c0273/manifests/authority_release_manifest.json` — object identity, normalized hash, source evidence, last-known migration lineage, authority effect, dependencies;
- `supabase/recovery/c0273/README.md` — provenance and non-replay warning;
- canonical Edge path recovery for `supabase/functions/fpl-full-pool-optimizer/index.ts` only after explicit approval, preserving v15 adapter semantics.

A later reviewed consolidation may convert forensic recovery artifacts into normal canonical migrations/snapshots. Package A itself should first preserve evidence and reproducibility without rewriting provenance.

## 5. Required provenance header
Every recovered SQL artifact should state:
- `Recovered under C0273`
- original Supabase migration version/name when applicable
- ledger statement hash
- current-object normalized hash if the object still exists
- extraction timestamp
- source: active production Supabase migration ledger/current catalog
- `NOT ORIGINAL GIT DEPLOYMENT COMMIT`
- `DO NOT REPLAY BLINDLY INTO PRODUCTION`
- intended semantic effect: NONE / source recovery only

This prevents future engineers from mistaking forensic reconstruction for original deployment chronology.

## 6. Object-to-migration mapping rule
Do not assume the migration that created an object equals the migration defining its current semantics. For each current object:
1. scan ordered ledger statements for CREATE/ALTER/REPLACE references;
2. record first-known creation migration;
3. record every subsequent altering migration;
4. identify last-known semantic writer;
5. compare final replayed definition to current catalog normalized hash;
6. classify MATCH / REPLAY_DIFF / CURRENT_ONLY / LEDGER_ONLY / AMBIGUOUS.

This is especially important for C0237 and C0248, which were repeatedly replaced during cutover/hardening.

## 7. Edge recovery included in Package A
The known remaining Edge P0 mismatch remains:
- deployed `fpl-full-pool-optimizer` v15 = C0240 role-safe adapter;
- GitHub canonical slug path still represents older C0228 core behavior;
- historical core remains separately pinned as `fpl-full-pool-optimizer-core-v02`.

Package A must recover the v15 adapter source and preserve the layered identity:
`deployed slug/version -> adapter semantic version -> delegated core source/version -> optimizer_version returned downstream`.

The CP39 recoveries (`refresh-current-player-state` v8 and `fpl-sequential-planner` v6) should be included in the equivalence manifest but not rewritten again.

## 8. Isolated rebuild/equivalence test plan
Package A cannot be declared complete merely because files exist in GitHub.

### Stage A — static reconstruction
- start from an isolated empty/non-production Postgres/Supabase-compatible database;
- apply the repository baseline plus the recovered authority artifacts in documented order;
- no connection to production writes or schedulers;
- enumerate resulting functions/views/triggers/indexes/constraints;
- compare normalized object hashes against the frozen live manifest.

### Stage B — schema/authority invariant comparison
Require equality or explicitly adjudicated representation equivalence for:
- function signatures and security/search_path properties;
- view definitions;
- append-only publication mutation trigger;
- unique input signatures/authority constraints;
- C0248 planner/promotion storage and selector-supporting indexes;
- C0240 adversarial queue/run/task invariants;
- bridge functions exposed to Edge/API consumers.

### Stage C — deterministic read-only behavioral fixtures
Using copied/synthetic fixtures only, verify:
- C0240 status returns same readiness classification for frozen fixture rows;
- C0248 planner/selector status returns same classification for frozen planner rows;
- C0237 publication readiness/lineage checks produce same non-mutating status paths where possible;
- C0234 status bridge produces same gate-state representation;
- current-plan view returns same row selection under identical publication rows.

Do not invoke promotion/publication mutation paths against production.

### Stage D — Edge adapter equivalence
Against frozen test inputs:
- recovered v15 adapter must delegate to the same pinned core;
- legal squad/role checks must match active runtime behavior;
- response schema and downstream `optimizer_version` contract must match;
- no numeric decision difference tolerated unless proven representation-only.

### Stage E — disaster-recovery rehearsal
Prove a clean environment can reconstruct the complete authority graph from GitHub + documented Supabase durable-state restore assumptions without relying on hidden live source.

## 9. Package A acceptance gate
Package A is ready to execute only when all are true:
- exact ledger extraction list frozen;
- exact current-object inventory frozen;
- all recovery files carry provenance headers;
- v15 adapter artifact frozen;
- no Package B semantic change appears in diffs;
- isolated rebuild procedure is executable;
- expected hash/equivalence manifest is reviewable;
- rollback is simply source-branch revert because no production deployment is part of initial recovery;
- explicit user approval is recorded before source recovery write actions.

Package A is complete only when:
- GitHub can reconstruct the authority source graph;
- recovered current definitions match frozen production fingerprints or every difference is explicitly adjudicated;
- CP39 Edge recoveries pass equivalence evidence;
- v15 adapter canonical source is restored;
- no production behavior changed during source recovery.

## 10. Package B remains excluded
Do not mix any of the following into Package A:
- official deadline authority repair;
- manager-state authority changes;
- settlement lifecycle/finality changes;
- canonical publication pointer/revision changes;
- production-selected uniqueness/CAS changes;
- semantic-generation/consumed-vector changes;
- PRE-FINAL orchestration changes;
- cron/controller/VPS cutover.

Those are behavior-changing semantic architecture packages and remain separately approval-gated.

## 11. Red-team findings preserved
1. **Ledger replay is not automatically canonical reconstruction.** Historical migrations may depend on objects/data that evolved outside the recovered subset; isolated replay must expose those dependencies rather than patch around them silently.
2. **Current catalog and historical ledger serve different purposes.** Ledger proves chronology; current catalog proves present semantics. Both must be preserved.
3. **Hash normalization is representation-sensitive.** The whitespace-normalized MD5s are forensic fingerprints, not cryptographic release identities. Future release manifest should use stronger canonical serialization/hashing.
4. **Branch ancestry remains hazardous.** The planning branch predates CP39 main source recoveries. Package A integration must not merge old function source over `fc93e5...` / `cf8e7e...` recoveries.
5. **Tracker linkage is stale.** CP40-45 are not yet in live tracker implementation_refs. This is governance drift, not runtime drift.
6. **Source parity does not cure semantic defects.** A perfect reconstruction of today's SQL would faithfully reproduce today's latest-row publication semantics, deadline split and other known Package B defects.

## 12. Approval posture
Package A is now sufficiently specified to prepare exact recovery artifacts, but under the current instruction **no source recovery should be executed in this checkpoint**.

Recommended next bounded planning checkpoint, CP46:
- freeze the complete authority object inventory including triggers/indexes/constraints/tables and dependency edges;
- define the exact authority release-manifest schema and recovery ordering;
- produce the final Package A approval dossier with file/action counts and explicit no-behavior-change diff contract.

After CP46, further planning of Package A risks diminishing returns; the next meaningful step should be explicit approval to execute source recovery, or a conscious decision to defer it.

## Decision
CP45 converts the confirmed production-ahead drift into an executable recovery design without touching production or canonical source. Package A has a safe forensic layout, provenance contract, live fingerprints, mapping method and isolated equivalence plan. The dominant remaining planning item is to freeze dependency/constraint scope and present one final approval dossier.

**No production behavior changed. Production/source recovery remains explicitly approval-gated.**