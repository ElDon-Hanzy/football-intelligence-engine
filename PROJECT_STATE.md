# Football Intelligence Engine — Project State

_Last updated: 2026-09-08 (Dubai) — C0213 architecture-consolidation closure candidate_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research.

Permanent rules:

- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Completed-match evidence may update future decisions only.
- Retrospective replay/shadow work is stored separately and never presented as a genuine historical prediction.
- Missing data is not zero.
- Preserve provenance plus `known_at` / `captured_at` / `evidence_cutoff` timestamps.
- Never commit secrets/API keys.
- Unvalidated intelligence remains research/shadow until its registered forward gate passes.
- Distinguish Planned / Coded / Committed / Deployed / Executed / Verified.
- Do not tune on an outcome and then call a same-sample rerun independent validation.
- Negative experiments are first-class evidence.
- Projection readiness is not decision readiness.

Canonical architecture references:

- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `DECISIONS_AND_HISTORY.md`

## 2. Production source of truth

Supabase project: `knooiwezzsxcwhtjtdap`.
GitHub: `ElDon-Hanzy/football-intelligence-engine`.
Working engineering ledger: `public.change_tracker_working`.

For a resumed engineering session:

1. read this file and `DECISIONS_AND_HISTORY.md`;
2. read the relevant recent handover/change docs;
3. query `public.change_tracker_working`;
4. run `private.audit_change_tracker_governance_v01()`;
5. inspect `private.c0213_architecture_registry_status_v01()`;
6. inspect the relevant forward-cohort and target-GW readiness status functions;
7. independently verify current Supabase/GitHub state before material changes.

Live runtime/registry evidence outranks stale handovers.

## 3. C0213 architecture consolidation — current state

C0213 audited the whole path:

`SOURCE → INGESTION → RAW/CANONICAL → FEATURE/STATE → MODEL/TRANSFORM → PROJECTION → DISTRIBUTION → OPTIMIZER → DECISION → API/UI`

and the research path:

`SOURCE → FEATURE/MODEL → SHADOW OUTPUT → EVALUATOR → PROMOTION/REJECTION GATE`.

Current architecture status after P4:

- registry integrity: **green**
- system consolidation: **green**
- components: **632**
- DB components: **546**
- active crons: **27**
- dependency edges: **1,084**
- production-effect components: **14**
- required capabilities: **19**
- missing required capabilities: **0**
- required capability contradictions: **0**
- active duplicate cron targets: **0**
- active RETIRED external deployments: **0**
- behavioral production proof: **14/14 current PASS**
- tracker consumption contracts: **61/61 covered**
- global tracker governance: **green**

P4 adds definition-hash-bound behavioral proof. A future production function/view/runtime change invalidates its old PASS until deliberately reproven.

Current canonical proof surfaces:

- `private.run_c0213_behavioral_consumption_tests_v01(gw)`
- `private.c0213_behavioral_consumption_status_v01()`
- `private.c0213_prediction_effect_provenance_v01`
- `private.c0213_prediction_effect_provenance_status_v01(gw)`
- `private.c0213_tracker_consumption_governance_v01()`

GW4 run 1325 provenance proof:

- 604 predictions
- 604/604 baseline lineage
- 604/604 team/opponent lambda lineage
- 604/604 event-distribution lineage
- 604/604 fixture-generator lineage
- 514/604 non-zero net xPts deltas vs baseline.

## 4. Key C0213 corrections already deployed

### P0 — realized-role consumer bridge

C0212 realized roles were factual and useful, but downstream fixture-role snapshots could not resolve the quantitative base profile because virtual overlay timestamps/taxonomy leaked into a physical-profile join.

C0213 P0 now preserves:

- realized categorical role;
- physical base-profile identity for quantitative axes;
- explicit overlay/base evidence;
- `numeric_role_uplift_enabled=false`.

No new role coefficient was introduced.

### C0204 continuous projection coverage

Projection eligibility is continuously reconciled. Narrowly defined genuinely new players may receive governed pending exclusion; existing-player/data-regression gaps remain ungoverned and block projection generation.

Current projection universe has no ungoverned missing player.

### P1 — architecture / duplicate / selector / full-pool fixes

- duplicate competitive-core cron removed;
- tactical current selector now prefers calibrated v0.1.1;
- decision snapshots fail closed when decision evidence is red;
- canonical full-pool optimizer deployed;
- machine-readable component/dependency/capability registry deployed.

### P2 — orchestration/readiness lineage

- upstream FPL horizon extended to first three future GWs;
- strict C0166 fixture readiness required;
- immutable optimizer input signature introduced;
- manager state made explicit;
- future manager-plan writes fail closed;
- projection readiness separated from decision readiness;
- APIs/UI expose readiness semantics.

### P3 — canonical core / retirement consolidation

The active core was renamed in-place from the misleading `generate_upcoming_fpl_snapshot_c0160_legacy_v01` to `generate_upcoming_fpl_projection_core_v01`; the function object/OID was preserved.

Retired C0206 v01 invocation surfaces were removed. Nineteen lifecycle-RETIRED external runtimes were audited and reconciled to **19/19 physically inactive/deleted**. No live internal consumer remained.

### P4 — behavioral consumption + effect provenance

Every `production_effect_enabled=true` component now requires current behavioral proof. Implemented model-effect tracker work requires an explicit consumer/evaluator/governance pathway. Prediction-level effect lineage is directly inspectable.

## 5. Canonical FPL production path

```text
results + FPL + football sources
        ↓
current player/team/role/fixture state
        ↓
C0159 bounded fixture derivative
        ↓
C0166 bounded symmetric evidence layer
        ↓
FPL projection core
        ↓
point distribution
        ↓
3-GW full-pool optimizer
        ↓
decision readiness / Noise-Control
        ↓
saved manager plan
        ↓
APIs / frontend-v2
```

The full-pool optimizer is read-only. It does not write `fpl_manager_plans` and therefore cannot bypass manager-state/readiness/Decision-Control.

There remain two intentionally distinct selectors:

1. automated current-15 selector in the projection core;
2. full-pool optimizer + external manager adjudication.

The saved manager plan is authoritative only when present and readiness permits it.

## 6. Current GW4 readiness — no FPL action yet

GW3 result run is final, but GW4 decision readiness is still blocked. At the latest audited state the material blockers are:

1. **realized-role refresh incomplete** — 203/220 starters mapped (92.27%) against latest final GW3 result run;
2. **C0167 evidence consistency** — MUN–MCI has one `CATEGORICAL_CALL_WITHOUT_EXPLANATION` hard violation;
3. **manager state not captured** for GW4;
4. **full-pool optimizer not current** because exact 3-GW decision-grade inputs are not yet ready/current.

No GW4 manager plan is authorized. Do not make transfer/captain/bench/chip recommendations until these gates are cleared and the full FPL Decision-Control process is run.

## 7. A0005 forward validation — now complete and ready for adjudication

A0005 / E0006 is now fully scored:

- GW2 VALIDATION: 10/10 fixtures
- GW3 TEST: 10/10 fixtures
- predictions/evaluations: 140
- near-close coverage: 10/10 in each split
- integrity violations: 0
- state: `GW3_COMPLETE_PROMOTION_GATE_ELIGIBLE`

Per-variant sample is still only 10 fixtures in each split. The registered C0125 effect-family promotion gate requires ≥50 VALIDATION and ≥30 TEST observations plus ≥0.005 Brier gain in both, no log-loss regression, acceptable process MAE and zero integrity violations.

Therefore the next task is a **formal promotion/rejection/no-promotion review**, not retuning. Existing promotion-assessment rows were created before the forward cohort completed and are stale for this decision.

## 8. W0002 remains independently frozen

W0002 / E0008:

- GW4 = VALIDATION
- GW5 = TEST
- 20 registered fixtures
- model effect disabled
- no current evaluations yet
- A0005 remains untouched.

Do not modify its frozen cohort based on A0005 results.

## 9. Other active research

### C0120 / E0007
Correct Score mispricing hypothesis remains research only. Current finished-candidate evidence is far too sparse for a value claim.

### C0154 / C0196
Score-selector/tail calibration remains open. Current high-tail evidence is interesting but too small for production distribution changes.

### C0197
High-score/shootout research has frozen pre-GW3 experiments and forward evaluations. Chaos-only/eSOT branches failed robust-edge gates; shootout-specific hypotheses remain shadow only. No production effect.

### C0202
Exact-side inference is useful as a forward shadow, but generic flank xPts effects remain off. Current outcome sample is 33; promotion requires ≥100 paired outcomes over ≥5 GWs plus later holdout evidence.

### C0203–C0211
Post-transfer/new-player regime work is mostly monitoring/deferred. Do not pull deferred model families forward merely because architecture consolidation is complete.

## 10. Blocked external dependencies

- C0034 — third normalized pre-kickoff Correct Score source.
- C0082 — genuine licensed spatial/tracking evidence for true pressing/line height/geometry.

Do not substitute weak proxies just to close these rows.

## 11. UI state

`frontend-v2` is the preferred rebuilt interface and strict CI covers mobile/tablet/desktop contracts, accessibility and deployment integrity.

C0176 controlled primary-route cutover / legacy retirement remains a separate explicit task. Legacy root remains rollback-capable until that item is deliberately closed.

## 12. Security/performance backlog

Supabase advisors after C0213 P4 show no new P4-specific mutable-search-path or exposure defect. Existing backlog remains:

- many public RLS-enabled tables intentionally have no direct policies and are service-path only;
- older private functions with mutable `search_path` warnings;
- `pg_net` installed in `public`;
- many foreign keys without covering indexes, including `fpl_projection_coverage_audits.prediction_run_id`;
- many indexes currently reported unused.

Treat these as a dedicated security/performance cleanup. Do not remove indexes solely because the current advisor says “unused.”

## 13. Immediate operating sequence

1. finish formal C0213 verification/closure and keep its architecture gates active permanently;
2. clear GW4 realized-role / C0167 / manager-state / projection-horizon blockers;
3. run the completed A0005 promotion/rejection review without retuning;
4. only after GW4 decision readiness is green, run full-pool FPL optimization and Decision-Control;
5. then save the authoritative GW4 manager plan if a robust action edge exists.

This file is intentionally concise. Detailed architecture, model lifecycle, scheduling and C0213 findings live in the four canonical C0213 documents listed in Section 1.
