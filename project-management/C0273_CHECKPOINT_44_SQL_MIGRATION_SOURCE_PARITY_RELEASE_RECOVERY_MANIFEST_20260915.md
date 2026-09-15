# C0273 — Checkpoint 44: SQL Migration/Source Parity & Release-Recovery Manifest

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Mode: PLANNING / READ-ONLY FORENSIC AUDIT
Production effect: NONE

## Authorization boundary
No live SQL, migration, schema, trigger, Edge Function, runtime/model behavior, cron, API/UI, publication, selector state or FPL account was changed. This checkpoint only inventories and classifies recovery risk.

## Executive finding
CP43's SQL source-control concern is confirmed and materially larger than the Edge mismatch.

Production's Supabase migration ledger contains a large authority/control-plane history that is **not present as migration files on GitHub main**. The live migration ledger itself retains `statements[]`, so the source is recoverable from production evidence, but GitHub main is not currently a sufficient disaster-recovery source for the canonical FPL decision/control plane.

This is a P0 Pre-VPS reproducibility blocker.

## 1. GitHub main source tree
Exact recursive tree inspection of GitHub main at commit `cf8e7e41318830060fba6e2f64b1471f85167252` proves `supabase/migrations/` exists but jumps from the 2026-09-09 C0237/C0239/autonomy files to a small set of later files (C0251, C0254, C0257, C0272). There are **no GitHub main migration files named for C0240 or C0248**.

Relevant source-controlled files include:
- `20260909173747_c0237_always_live_fpl_plan_publication_v01.sql`
- `20260909174251_c0237_require_complete_layer_lineage_v02.sql`
- `20260909_c0228_c0234_autonomy_runtime.sql`
- `20260911233500_c0251_captaincy_current_lineage_gate.sql`
- `20260912173500_c0254_fpl_public_projection_payload_v01.sql`
- `20260912225723_c0257_post_lock_actual_decision_sync.sql`
- `20260914030600_c0272_post_audit_consolidation.sql`

The C0272 file explicitly says production was applied first and the migration later reconciled source control. This proves the project has already used a production-first/source-reconciliation workflow and reinforces the need for a formal recovery manifest.

## 2. Production migration ledger
The live `supabase_migrations.schema_migrations` table stores `version`, `statements[]`, `name`, `created_by`, `idempotency_key`, and `rollback[]`.

For the direct authority families alone, production records:
- C0234: 1 named migration
- C0237: 7 named migrations
- C0240: 16 named migrations
- C0248: 27 named migrations

Total direct named authority-family records: **51**.

This excludes adjacent C0241, C0242, C0251, C025x and C0272 migrations that also materially affect the final decision/publication chain.

## 3. Exact high-level parity classification

### C0237
Production ledger has 7 C0237 migrations. GitHub main has the first two named C0237 migration files. The later live ledger contains:
- c0237_require_c0240_lineage
- c0237_render_c0240_survivor
- c0237_current_projection_lineage_fix
- c0237_publish_contested_when_c0248_not_promoted
- c0237_post_deadline_final_closure_publication

Those later named migration files are absent from GitHub main tree.

Disposition:
- initial C0237 v1/v2: `SOURCE_FILE_PRESENT; LIVE_EQUIVALENCE_NOT_YET_NORMALIZED`
- later C0237 authority evolution: **`LIVE_AHEAD_RECOVERABLE` / P0**

### C0240
Production ledger contains 16 C0240 migrations covering final adversarial evidence, distributed queue, same-horizon role/path gates, orchestration, exact slot/path search, path evaluator routing, finalization, prediction lineage, repeat cycles, legal slot repair, regression and policy signature.

GitHub main contains C0240 planning/closeout documentation and Edge support code, but **zero C0240 migration files** in `supabase/migrations/`.

Disposition: **`LIVE_AHEAD_RECOVERABLE` / P0**.

### C0248
Production ledger contains 27 C0248 migrations covering planner storage/status, dispatch, price/chip/option-value controls, decision-control status, live publication integration, mature option-value guards, selector candidate consumers, selected-path publication cutover, verified-candidate promotion and fail-closed production bridge.

GitHub main contains extensive C0248 documentation and the recovered sequential-planner Edge source, but **zero C0248 migration files**.

Disposition: **`LIVE_AHEAD_RECOVERABLE` / P0**.

### C0234
The production ledger has `c0234_c0213_readiness_bridge` (20260908213853). GitHub main has `20260909_c0228_c0234_autonomy_runtime.sql`, but no file with the exact live bridge migration identity. The Edge `fpl-autonomous-gate` source itself was previously observed aligned.

Disposition: **`SEMANTIC_SOURCE_PARTIAL / MIGRATION_PROVENANCE_DIVERGENT_OR_INCOMPLETE` / P0 until normalized comparison**.

### Adjacent authority migrations
C0241/C0242/C0251 and later C0237 repairs also participate in final readiness. Several are live-ledger entries with no same-name GitHub migration file. C0251/C0254/C0257/C0272 have GitHub files with different timestamps from production ledger entries, indicating source reconciliation/re-materialization rather than exact migration identity.

Disposition: `SEMANTIC_SOURCE_PRESENT_OR_RECOVERABLE; EXACT_MIGRATION_IDENTITY_UNPROVEN`.

## 4. Critical correction to CP43
CP43 cautiously said representative SQL definitions could not be found in GitHub search and classified SQL source parity as unproven. CP44 now proves the stronger statement:

**The production migration history is materially ahead of GitHub main.**

This is not merely a code-search indexing issue. Exact recursive repository-tree inspection shows the C0240/C0248 migration files are absent while production's migration ledger proves they were applied.

## 5. Recovery safety
This is serious but recoverable. Production has three independent evidence surfaces:
1. current live object definitions (`pg_get_functiondef`, `pg_get_viewdef`, trigger/index/catalog definitions);
2. Supabase migration ledger `statements[]` preserving applied migration statements;
3. project closeout/decision documentation describing intended semantics and cutover evidence.

Therefore the correct recovery direction remains:
`freeze live definitions + ledger statements -> compare against historical docs/commit chronology -> normalize -> source-control recovered migrations/snapshot -> isolated rebuild equivalence -> only then declare parity`.

Do **not** replay historical migrations blindly into production. Production already contains them. Recovery is a source-control/disaster-recovery action first.

## 6. Release-recovery disposition matrix

| Surface | Current disposition | Priority | Recovery risk | Behavior change needed? |
|---|---|---:|---|---|
| Most audited P0/P1 Edge functions | MATCH_OBSERVED | P1 | Low/medium until normalized manifest | No |
| refresh-current-player-state v8 | RECOVERED_PENDING_EQUIVALENCE | P0 | Medium | No intended change |
| fpl-sequential-planner v6 | RECOVERED_PENDING_EQUIVALENCE | P0 | Medium | No intended change |
| fpl-full-pool-optimizer v15 adapter | LIVE_AHEAD_RECOVERABLE | P0 | High rebuild risk | No intended change |
| C0237 initial migration v1/v2 | SOURCE_FILE_PRESENT_EQUIVALENCE_UNPROVEN | P1 | Medium | No |
| C0237 later authority migrations | LIVE_AHEAD_RECOVERABLE | P0 | High | No intended change for source recovery |
| C0240 SQL authority graph | LIVE_AHEAD_RECOVERABLE | P0 | Critical | No intended change for source recovery |
| C0248 SQL selector/control graph | LIVE_AHEAD_RECOVERABLE | P0 | Critical | No intended change for source recovery |
| C0234 migration provenance | PARTIAL/DIVERGENT_IDENTITY | P0 | High | No intended change for source recovery |
| current_fpl_live_plan_v01 latest-row semantics | LIVE_AND_SOURCE_HISTORY_PARTIAL; SEMANTIC_DEFECT | P0 | High authority risk | **Yes** — separate approval package |
| production-selected uniqueness/CAS | SEMANTIC_AUTHORITY_UNRESOLVED | P0 | High | **Yes** — separate approval package |
| official deadline authority | SEMANTIC_AUTHORITY_UNRESOLVED | P0 | High | **Yes** |
| manager current-private authority | SEMANTIC_AUTHORITY_UNRESOLVED | P0 | High | **Yes** |
| settlement finality | SEMANTIC_AUTHORITY_UNRESOLVED | P0 | High | **Yes** |
| semantic generation/consumed vector | DESIGN_PENDING | P0/P1 | High | **Yes** |

## 7. Safe recovery vs semantic repair

### Package A — source/reproducibility recovery
Intended zero production behavior change:
- recover v15 optimizer adapter canonical source;
- recover/materialize C0240/C0248/later-C0237/C0234 live SQL authority definitions into canonical source control;
- preserve original live migration ledger provenance rather than pretending newly created files were original deployment commits;
- create normalized object hashes/release manifest;
- prove isolated rebuild equivalence for recovered Edge + SQL graph.

This package is suitable for approval once the exact recovery artifacts are prepared.

### Package B — semantic authority repairs
Behavior-changing and must remain separately approval-gated:
- official FPL deadline sole authority;
- manager-state authority model;
- settlement lifecycle/finality;
- canonical current publication resolver/revision instead of latest-row chronology;
- selector uniqueness/CAS/authority revision;
- semantic generations and consumed-generation vectors;
- PRE-FINAL autonomous orchestration contract;
- eventual scheduler/controller/VPS cutover.

Source recovery must not silently bundle Package B changes.

## 8. Pre-VPS implication
A VPS move today would risk migrating an incomplete reconstruction model: GitHub cannot currently reproduce the SQL decision authority that already exists in Supabase. Therefore VPS remains correctly deferred.

The desired pre-VPS state is:
- GitHub reconstructs application + Edge + SQL/control-plane source;
- Supabase retains durable semantic state and applied-migration evidence;
- runtime release manifest proves which exact source graph is active;
- semantic authority defects are either repaired or explicitly bounded with a migration-safe contract.

## 9. Next bounded checkpoint — CP45
Prepare the **exact source-recovery package without applying it**:
1. extract canonical live definitions and migration-ledger statements for C0240/C0248/later C0237/C0234;
2. map each live object to its creating/last-altering migration where possible;
3. calculate normalized live object hashes;
4. define canonical recovered-file layout and provenance headers;
5. include the v15 optimizer adapter in the same reproducibility package;
6. produce an isolated rebuild/equivalence test plan;
7. present Package A for explicit approval only after artifacts are fully specified.

Do not mix semantic repairs into CP45.

## Decision
CP44 upgrades the SQL parity issue from `UNPROVEN` to **confirmed production-ahead source drift**. C0240 and C0248 are the largest gaps: production has 16 and 27 applied named migrations respectively while GitHub main has no corresponding migration files. The live migration ledger preserves statements, so recovery is feasible without guessing. This is now the dominant source-reproducibility blocker before VPS migration.

**No production behavior changed.**