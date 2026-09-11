# Football Intelligence Engine — System Architecture

_Last updated: 2026-09-11 — C0247 architecture audit_

## 1. Purpose

The engine has two linked products:

1. **FPL decision intelligence** — maximize future season-long FPL points and rank under uncertainty.
2. **Football market-mispricing research** — identify context-driven value that survives chronology-safe forward validation.

Historical forecasts are immutable. Missing data is not zero. Research code does not acquire production effect merely by existing.

## 2. Source-of-truth order

1. live Supabase runtime and `public.change_tracker_working`;
2. C0213 architecture registry/dependency graph/governance;
3. current GitHub source and migrations;
4. canonical documentation;
5. historical handovers / legacy registries.

## 3. Lifecycle contract

Components are classified as PRODUCTION, SHADOW, RESEARCH, UI_ONLY, INFRASTRUCTURE or RETIRED. Lifecycle is separate from canonical status and from `production_effect_enabled`.

At the C0247 audit the registry contains 720 components, but only 14 production-effect components. Behavioral proof is 14/14 current PASS.

## 4. Production forecast path

```text
RESULTS / FPL / FOOTBALL SOURCES
        ↓
INGESTION + CHRONOLOGY/PROVENANCE
        ↓
CANONICAL PLAYER / TEAM / ROLE / FIXTURE STATE
        ↓
C0159 BOUNDED FIXTURE DERIVATIVE
        ↓
C0166 PRODUCTION FIXTURE FORECAST
        ↓
TEAM LAMBDA ADJUSTMENT
        ↓
PLAYER GOAL/ASSIST LAMBDA v03
        ↓
EVENT POINT DISTRIBUTION
        ↓
PLAYER PROJECTION CORE
        ↓
FULL-POOL OPTIMIZER
```

Key production components include:

- `private.refresh_current_season_team_performance_v01`
- `private.fpl_adjusted_team_lambda_v01`
- `private.fpl_fixture_goal_lambda_v03`
- `private.fpl_fixture_assist_lambda_v03`
- `private.fpl_current_event_distribution_v01`
- `private.generate_upcoming_fpl_projection_core_v01`
- `private.refresh_c0159_production_fixture_forecasts_v01`
- `private.refresh_c0166_production_fixture_forecasts_v01`
- `public.current_realized_player_roles`
- `public.current_player_role_profiles`
- `public.current_production_fixture_prediction_v01`
- `fpl-full-pool-optimizer`.

Realized roles are factual categorical state. Research/shadow families remain zero numeric production effect unless promoted through their explicit gate.

## 5. Current downstream FPL decision stack

The current live decision path is larger than the forecast core:

```text
FULL-POOL OPTIMIZER
  ↓
C0227 uncertainty/sensitivity
  ↓
C0228 diverse ensemble / equivalence
  ↓
C0229 structural robustness
  ↓
C0230 shadow team-regime diagnostic (zero numeric effect)
  ↓
C0231 forward-management approximation
  ↓
C0232 OR/rank utility
  ↓
C0233 adversarial red team
  ↓
C0240 final adversarial optimization
  ↓
C0234 fail-closed final authorization
  ↓
C0237 live publication
```

Cross-cutting controls:

- C0241 exact-horizon lineage/repeat-idempotency.
- C0242 named-challenger persistence and captaincy equivalence — implemented but not yet fully integrated into C0234/C0237.

C0247 concludes that this decision stack is now the main over-engineering risk.

## 6. Current optimizer semantics and limitation

The canonical full-pool optimizer:

- evaluates the legal full player pool using top-xMins plus explosive exceptions;
- supports a 1–5 GW weighted horizon;
- uses current selling prices, manager state and transfer-cost accounting;
- selects the best XI separately each GW;
- uses tail-aware captain selection;
- discounts bench output with a configurable bench weight (default 0.12);
- classifies edges against a model-error margin.

However, it evaluates a candidate XV largely as a static squad across the horizon. It does **not** yet model the weekly transition in which +1 FT arrives, prices/information change and the manager can re-optimize again next Gameweek.

C0240 tests immediate current-FT / +1-hit / +2-hit paths, not sequential multi-GW transfer trajectories.

## 7. Target decision architecture after C0247

Do not add C0243-C0246 as four independent production layers.

The intended consolidation target is one **Multi-GW State-Transition Decision Planner**:

```text
STATE(t)
  squad + bank + purchase/selling prices + FT inventory + chip inventory + information
        ↓
ACTIONS(t)
  roll / legal FT sequence / hit / WC / BB / TC / FH
        ↓
SCORING(t)
  XI-first expected points + separate captaincy + state-dependent bench value
        ↓
TRANSITION
  price/information update + one new FT + preserved chip state
        ↓
STATE(t+1)
```

The planner must compare reachable transfer trajectories against Wildcard/reset paths and preserve uncertainty/no-meaningful-edge semantics.

Price movement affects feasibility/execution timing, not xPts.

## 8. Final gate design principle

One final authorization boundary should remain fail-closed. It should consume unique diagnostics rather than duplicate optimization internally.

More gates are not automatically safer. Overlapping decision authorities can create contradiction and make failure diagnosis harder.

C0242 named-challenger resolution should be integrated into this boundary before additional downstream production runtime is introduced.

## 9. Research architecture

Research remains separate:

```text
SOURCE → FEATURE/MODEL → SHADOW OUTPUT → EVALUATOR/ABLATION → PROMOTION OR REJECTION
```

Negative evidence is preserved. Promotion requires the registered forward-validation contract. C0230, C0224 and other unpromoted families remain non-numeric.

## 10. Governance and integrity

Current audit state:

- required capabilities: 19/19
- behavioral production proof: 14/14 PASS
- tracker consumption contracts: 83/83
- active duplicate cron targets: 0
- active retired external deployments: 0
- architecture registry integrity: green

One active research-only orphan, `EDGE_FUNCTION:c0120-historical-correct-score`, exists live but is not represented in current GitHub source. It should be reconciled separately.

## 11. Canonical references

- `PROJECT_DESCRIPTION.md`
- `PROJECT_STATE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `DECISIONS_AND_HISTORY.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`