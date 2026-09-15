# C0273 — Checkpoint 38: Deployed Runtime / Source Parity & Recovery Contract

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Bound the P0 source-recovery contradiction discovered in Checkpoint 37. This checkpoint asks whether the currently deployed Supabase Edge runtime can be reconstructed from GitHub, what evidence exists to recover runtime-only source safely, and what contract must be satisfied before VPS migration or any source-controlled rebuild.

This checkpoint is read-only architecture analysis. It does not copy deployed code into GitHub, deploy, roll back, change schema/runtime/model behavior, alter scheduling, promote/kill any component, or rewrite history.

## 1. Continuity

Checkpoint 37 established that deployed runtime outranks stale repository source when classifying current behavior, but that this is unacceptable as a long-term recovery posture. GitHub remains the intended canonical source/release/disaster-recovery plane. Therefore deployed-runtime/source parity is a P0 Pre-VPS stabilization requirement.

C0273 remains `Open / Planned / P0 / Pre-VPS Stabilization Planning` with zero runtime/model effect.

## 2. Live deployed inventory is recoverable as an artifact surface

The Supabase Edge inventory exposes, per deployed function:

- slug;
- active version;
- updated timestamp;
- verify-JWT setting;
- entrypoint/import-map metadata;
- deployment bundle SHA-256 (`ezbr_sha256`).

The Edge retrieval surface also returns the deployed source files for an active function. Therefore the current runtime is not opaque: active deployed source can be inspected and, after explicit approval, could be captured into a source-recovery package without modifying runtime.

This is important but does **not** make Supabase deployment state a substitute for source control. Active-runtime retrieval is a recovery source, not the desired canonical development/release history.

## 3. Two confirmed parity failures

### 3.1 `refresh-current-player-state`

Live deployment:

- Edge version: `8`
- bundle SHA-256: `9d475ca909aebf3a50fe44edf563d579f932d556352879af76864bc1ca298753`
- runtime state refresh version: `0.4_xmins_regime_symmetric`
- behavior includes predicted-XI consumption, positive/negative xMins regimes, role-stability gating, reduced prior weight under regime change, and `numeric_role_uplift_enabled:true`.

GitHub `main` / current C0273 branch source:

- older `refresh-current-player-state` implementation;
- state refresh version `0.2_realized_role`;
- fixed prior equivalent games = 6;
- no predicted-XI regime reset;
- `numeric_role_uplift_enabled:false`.

Repository-wide code search found no occurrence of `0.4_xmins_regime_symmetric` or `xmins_regime` in the indexed repository surface inspected during this checkpoint.

Classification: **CONFIRMED_RUNTIME_AHEAD / BEHAVIORALLY_MATERIAL / P0**.

A rebuild from current GitHub would risk silently reverting xMins behavior.

### 3.2 `fpl-sequential-planner`

Live deployment:

- Edge version: `6`
- bundle SHA-256: `e6387be4c603b5f47a8fa8b1368a218197c46a1f0c96c2774d1190ac6d9d2055`
- planner constant: `C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE`.

Live v6 materially contains features absent from the repository v4 snapshot, including:

- exact legal autosub expected-value handling;
- chip-aware state (`WILDCARD`, `FREE_HIT`, `BENCH_BOOST`, `TRIPLE_CAPTAIN`);
- current full-pool optimizer calls to construct fresh Wildcard/Free Hit squads;
- larger normal transfer action families up to five generated transfers;
- chip persistence / Free Hit reversion semantics;
- bounded price-headroom diagnostics;
- revised branch/selection behavior and cutover-candidate result contract.

GitHub `main` currently exposes `C0248_SEQUENTIAL_PLANNER_V04_WILDCARD_ROOT`. Repository-wide search found no indexed `SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE` or V05 implementation.

Classification: **CONFIRMED_RUNTIME_AHEAD / DECISION-MATERIAL / P0**.

A rebuild from current GitHub would risk silently reverting canonical planning behavior and chip semantics.

## 4. Scope is not proven to be only two functions

The active Edge inventory contains many functions with deployment versions greater than 1, including decision/control/API functions. A deployment version number alone does not prove repository drift: GitHub source may already match a later deployed version despite the numeric version, and bundle SHA cannot be directly equated to a Git blob SHA because packaging/import maps/build representation differ.

Therefore this checkpoint does **not** claim that every versioned Edge function is divergent, nor that only the two confirmed functions are divergent.

Target parity audit must classify every authority-relevant function, at minimum:

1. P0 finalization/decision functions;
2. P0 source/player-state/projection functions;
3. public/current-authority APIs;
4. actual/result truth functions;
5. remaining production functions;
6. research/maintenance functions last.

## 5. Source parity is multidimensional

A future parity manifest must not use only source-text equality. For each deployed function it should bind:

- function slug;
- deployed Edge version;
- deployment bundle SHA-256;
- deployed file set and deterministic content hashes;
- Git repository path;
- Git commit SHA containing the intended source;
- source-content hash after a defined normalization rule;
- dependency/import-map hash;
- verify-JWT/auth contract;
- runtime configuration contract excluding secret values;
- semantic component/model/planner version when applicable;
- deployment/release identity;
- parity disposition.

Suggested dispositions:

- `EXACT_SOURCE_PARITY`
- `REPRESENTATION_EQUIVALENT`
- `RUNTIME_AHEAD_RECOVERABLE`
- `REPOSITORY_AHEAD_NOT_DEPLOYED`
- `DIVERGENT_REQUIRES_ADJUDICATION`
- `RUNTIME_ONLY_NO_REPO_PATH`
- `RETIRED_RUNTIME_STILL_DEPLOYED`
- `RESEARCH_NONAUTHORITATIVE`
- `UNKNOWN_BLOCKED`

No automatic sync action follows from a disposition.

## 6. Recovery principle

The safe direction for a confirmed runtime-ahead function is **not** “deploy GitHub to make them equal.” That could destroy current behavior.

The safe recovery sequence, once explicitly approved, is conceptually:

1. freeze the exact active deployed artifact identity;
2. retrieve active deployed source + import map/config metadata;
3. create a forensic recovery artifact without changing production;
4. compare against repository history and tracker/decision records;
5. determine whether runtime source represents an authorized historical change, emergency repair, or undocumented drift;
6. reproduce/test the deployed behavior from recovered source in an isolated environment;
7. source-control the adjudicated recovered version with explicit provenance and historical note;
8. prove source-controlled build/redeployment equivalence;
9. only then allow normal source-controlled deployment/migration.

Historical repository files must not be rewritten to pretend the runtime version always existed there. Recovery should be a new explicit commit with provenance.

## 7. Release provenance contract

Future production deployments should be impossible to classify as healthy merely because an Edge function is ACTIVE.

Target release evidence should answer:

> Which Git commit and approved release produced this exact deployed semantic artifact?

A deployment should carry/queryably bind:

`git_commit_sha + source_manifest_hash + dependency_manifest_hash + deployment_bundle_hash + component_version + approval/change_id + deployed_at`

For authority-relevant functions, controller health should eventually detect `deployed artifact != approved release manifest` as configuration/source drift. This is a future implementation requirement, not implemented here.

## 8. Red-team cases

### A — Blindly copy live source into GitHub and call parity solved

Reject. It loses authorization/history context and may canonize an accidental hotfix without adjudication.

### B — Redeploy repository source to production to force equality

Reject. Confirmed examples would revert live xMins/planner behavior.

### C — Compare only Edge version numbers

Reject. Version number is deployment chronology, not semantic/source equality.

### D — Compare only bundle SHA with Git blob SHA

Reject. Different representation/build packaging can produce incomparable hashes. Define normalized source/dependency manifests.

### E — Treat active-runtime retrieval as durable disaster recovery

Reject. Provider runtime inspection is a recovery aid, not a substitute for canonical source-controlled release artifacts.

### F — Recover only current active version and erase prior deployment lineage

Reject. Current recovery is urgent, but historical version lineage should be preserved where evidence exists. Do not invent missing versions.

### G — Migrate to VPS before parity

Hard reject. VPS migration from stale GitHub could reproduce an older engine while appearing operationally successful.

## 9. Pre-VPS exit condition added

Before Hostinger/VPS build or any source-controlled production rebuild, require:

- every P0/P1 authority-relevant deployed function has a parity disposition;
- no `RUNTIME_AHEAD_RECOVERABLE`, `DIVERGENT_REQUIRES_ADJUDICATION`, `RUNTIME_ONLY_NO_REPO_PATH`, or `UNKNOWN_BLOCKED` remains unresolved for a required production component;
- confirmed live behavior is reproducible from a Git commit in an isolated environment;
- release provenance manifest exists for the intended migration baseline;
- recovery does not rewrite historical forecasts, recommendations, actuals or audit evidence.

This strengthens the Pre-VPS Exit Gate; it does not authorize G1 or Hostinger provisioning.

## 10. Planned repair package — NOT AUTHORIZED

### S4-R43 — Deployed Runtime / GitHub Source Recovery & Release-Provenance Closure

Proposed future approval-gated phases:

- **R43-A inventory:** produce complete parity manifest, read-only.
- **R43-B forensic recovery:** capture runtime-ahead active source into non-production recovery artifacts.
- **R43-C adjudication:** map recovered source to change tracker/decision history and classify authorization.
- **R43-D isolated equivalence:** build/test recovered source away from production.
- **R43-E source-control closure:** commit adjudicated source with provenance.
- **R43-F deployment guard:** later implement release-manifest/source-drift checks.

Approval must be phase-specific and non-transitive.

## 11. Contradictions / open questions preserved

1. Exact count of runtime/source mismatches across all active Edge functions remains unknown; only two are confirmed in this bounded batch.
2. Whether live v8 player-state and v6 planner were previously committed on an unmerged/deleted branch, generated directly during an earlier conversation, or deployed as runtime-only hotfixes remains unproven.
3. Repository code-search responses reported `incomplete_results=true`; absence from search strengthens but does not alone prove absence from every unreachable historical Git object/branch.
4. Exact normalized source-hash algorithm is not selected.
5. Exact dependency/import-map equivalence policy is unresolved.
6. Edge bundle SHA generation semantics are provider-specific and not assumed equal to source hash.
7. Exact release manifest storage location (GitHub artifact, Supabase audit table, both) remains open.
8. Whether non-Edge SQL functions/migrations have analogous production-vs-Git drift requires a later bounded audit; this checkpoint is Edge-focused.
9. Manager-state authority remains unresolved under Checkpoint 29.
10. Official deadline authority remains unresolved under S1-R1.
11. Canonical publication authority remains unresolved under S1-R3.
12. C0213 full-pool optimizer hard dependency remains unresolved under Checkpoint 26.
13. PRE-FINAL autonomous orchestration remains unimplemented under Checkpoint 28.
14. No FPL account execution is authorized.

## 12. Decision

C0273 records deployed-runtime/source parity as a **P0 Pre-VPS source-recovery blocker**, not a cosmetic documentation issue. Two behaviorally material mismatches are confirmed: `refresh-current-player-state` live v8 vs repository older source, and `fpl-sequential-planner` live v6 vs repository v4. The Supabase connector can retrieve active deployed source and deployment bundle hashes, so recovery is technically feasible, but parity must be resolved through forensic capture, historical adjudication, isolated equivalence and explicit source-control provenance—not by blindly redeploying stale GitHub or silently copying runtime code.

No production behavior changed.

**All implementation, runtime-source capture into canonical Git history, deployment, rollback, schema, scheduler, cadence, source, projection, model, planner, gate, publication, API/UI, promotion/retirement and account-execution changes remain explicitly approval-gated.**