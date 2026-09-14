# C0273 — Source Readiness Contract Draft

Date: 2026-09-14  
Status: DESIGN DRAFT — NO IMPLEMENTATION AUTHORIZED

## Purpose

Prevent the future autonomy controller from treating “pipeline ran successfully” as equivalent to “all decision-critical information is sufficiently covered.”

Source readiness is a separate dimension from data freshness, model health and decision readiness.

## Required record per fact family

Every P0/P1 fact family must eventually declare:

- `fact_family`;
- `provider_key`;
- `authority_tier`;
- `evidence_independence_class`;
- `source_effective_at` if available;
- `source_published_at` if available;
- `known_at` / ingestion time;
- `freshness_budget_normal`;
- `freshness_budget_final_window`;
- `completeness_invariant`;
- `contradiction_policy`;
- `fallback_policy`;
- `failure_effect`;
- `model_effect_scope`;
- `licensing_status`;
- `provenance_reference`.

## Evidence independence classes

- `OFFICIAL_AUTHORITY` — official FPL / official competition / official club source where appropriate.
- `INDEPENDENT_EXTERNAL` — separate third-party evidence capable of confirming/challenging internal inference.
- `MODEL_DERIVED` — output derived from FIE models/state.
- `SUPPORTING_TEXT` — useful text/status feed without complete authority/timing guarantees.
- `RESEARCH_ONLY` — may not satisfy production readiness.

Rule: `MODEL_DERIVED` evidence must never count as independent confirmation of another `MODEL_DERIVED` inference based on the same lineage.

## Current draft fact-family states

| Fact family | Current state | Evidence class | Final-window rule draft |
|---|---|---|---|
| Official deadline | source proven in locked-picks flow | OFFICIAL_AUTHORITY | must be present; no inferred-deadline fallback |
| League fixtures | automated | OFFICIAL_AUTHORITY/supporting canonical DB | must be fresh and non-contradicted |
| Prices/player metadata | FPL bootstrap every 4h | OFFICIAL_AUTHORITY | affordability-sensitive freshness required |
| Availability/status | FPL bootstrap | OFFICIAL_AUTHORITY | required, but cadence/source-item timestamp limitation tracked |
| FPL news text | FPL bootstrap | SUPPORTING_TEXT | cannot alone prove qualitative completeness |
| Internal xMins/start probability | player_state | MODEL_DERIVED | required model state, not external confirmation |
| Internal expected XI | legal-formation selection from model starts | MODEL_DERIVED | cannot be labeled independent predicted XI |
| External predicted XI | not proven | MISSING | policy decision required before FINAL contract |
| Press conference/team news | not proven | MISSING | material unresolved cases must degrade/block per approved policy |
| Penalty hierarchy | official FPL order | OFFICIAL_AUTHORITY | refresh before final decision when material |
| Direct FK/corner hierarchy | stored | OFFICIAL_AUTHORITY state | no production claim until consumer proven |
| Transfers/registration | mixed FPL dimension + researched events | MIXED | completeness contract required |
| Cup/Europe congestion | not proven complete | MISSING | schedule coverage required for rotation-sensitive decisions |
| Tactical/realized roles | automated FotMob/internal state | INDEPENDENT_EXTERNAL + MODEL_DERIVED | late material role change may require special refresh |
| Manager squad/FT/bank | snapshot system, recurring capture not proven | OFFICIAL_AUTHORITY target but ORCHESTRATION_GAP | must be current before optimizer dispatch |
| Actual submitted team | postdeadline FPL API | OFFICIAL_AUTHORITY | fail closed if unavailable |
| Results/player actuals | automated result pipeline | OFFICIAL_AUTHORITY | completion + settlement proof required |

## Source readiness states

- `P0_INFORMATION_COMPLETE` — all required P0 fact families satisfy their approved final-window contracts.
- `P0_INFORMATION_COMPLETE_WITH_ACCEPTED_DEGRADATION` — approved source is unavailable but explicit fallback policy permits continuation.
- `P0_INFORMATION_DEGRADED` — one or more P0 families are stale/partial but provisional analysis may continue.
- `P0_QUALITATIVE_SOURCE_MISSING` — qualitative team-news contract not satisfied where required.
- `MANAGER_STATE_STALE` — squad/economy snapshot not current enough to optimize.
- `SOURCE_CONTRADICTION` — authoritative/supporting sources materially disagree and policy requires adjudication.
- `SOURCE_OUTAGE` — required provider unavailable beyond budget.

## Controller policy draft

1. Source readiness is evaluated **before** projection/decision dispatch and again at commit/finalization time.
2. `PRE_FINAL` may be published under degraded states if clearly labeled and lineage-valid.
3. `FINAL_AUTONOMOUS_DECISION` may only be allowed under explicitly approved source-readiness states.
4. Missing qualitative evidence may not be converted into extra confidence by the model.
5. Source outage must never trigger hidden substitution with stale data unless the fallback contract explicitly permits it.
6. A new fact invalidates only the downstream lineage declared in the materiality map.
7. Source readiness status and blockers must be public-readable through the eventual status API.

## Manager-state P0 prerequisite

Before any autonomous optimizer/decision work:

- current entry ID must match target manager;
- target Gameweek must be explicit;
- exact 15-player squad must be present;
- bank and free transfers must be known;
- purchase/selling-price lineage must be sufficient for legal transfer feasibility;
- chip availability/history must be available when chip evaluation is in scope;
- source known-at must meet freshness policy;
- completion must be queryable;
- current snapshot must not be reconstructed from the engine recommendation.

## Open policy decisions

The implementation plan remains blocked until later user approval determines:

- whether independent external predicted XI is mandatory for FINAL or only a confidence enhancer;
- what provider class/cost/licensing is acceptable for press/team-news automation;
- whether missing press-conference coverage blocks all FINAL decisions or only materially unresolved player/team cases;
- final-window freshness budgets per fact family;
- how non-league congestion evidence may influence xMins without creating an unvalidated fatigue model.

## Non-change statement

This contract is documentation only. It changes no source, cron, model, schema, controller, website or decision behavior.
