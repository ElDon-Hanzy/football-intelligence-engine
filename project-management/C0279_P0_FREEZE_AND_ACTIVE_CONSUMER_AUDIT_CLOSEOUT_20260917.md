# C0279 P0 — Freeze & Active-Consumer Audit Closeout

**Date:** 2026-09-17  
**Status:** Completed / Verified  
**Production behavior changed:** No  
**Historical forecasts rewritten:** No  
**Diagnostic fixtures:** GW5 match 41 Brentford–Chelsea; GW5 match 45 Leeds–Crystal Palace

## 1. P0 objective

Freeze the current GW5 evidence and identify every active L5/L10/L20, fixture-forecast, player-projection, captaincy and chip consumer before C0279 changes calculations.

## 2. Frozen GW5 evidence manifest

Captured at **2026-09-17 17:53:02 UTC**.

| Artifact | Frozen evidence |
|---|---|
| Fixture prediction count | 10 |
| Current fixture snapshot IDs | 9084, 9085, 9086, 9087, 9090, 9091, 9088, 9089, 9092, 9093 |
| Fixture payload hash | `a7ce3ddf7b5620a3103dc6c307fa5fbc` |
| Player prediction run | 1426 |
| Player run generated | 2026-09-17 17:05:09 UTC |
| Player run frozen | true |
| Player prediction rows | 604 |
| Player prediction hash | `4c1e9ab3b700f29cedf173c242d41a47` |
| Team fact run | 24 |
| Team fact version | `c0167_fact_layer_v05` |
| Team fact hash | `b30f4574e1b6b8b8690fd6d29090754d` |
| C0276 cycle | 2 / RUNNING |
| C0276 fixture lineage | `672f899646807611bd4fd09705f8ec81` |
| Latest publication | 35 / PRE_FINAL / CONTESTED / DECISION_NOT_READY |
| External execution authorized | false |

The freeze is evidentiary: existing append-only snapshots and hashes are preserved. No row was rewritten or promoted.

## 3. Diagnostic fixture baselines

### Match 41 — Brentford vs Chelsea

- Current production snapshot: 9084
- Lambda: Brentford 1.720154, Chelsea 1.593561
- Total lambda: 3.313715
- Home/draw/away: 41.16% / 22.93% / 35.85%
- Over 2.5: 64.26%
- BTTS: 65.36%
- Raw/headline modal: 1–1 at 9.97%
- Next cells: 2–1 8.58%; 1–2 7.95%; 2–2 6.83%
- Defect: high-scoring distribution summarized by a low representative headline because the largest isolated cell automatically survived the selector.

### Match 45 — Leeds vs Crystal Palace

- Current production snapshot: 9090
- Lambda: Leeds 1.644665, Palace 1.489961
- Home/draw/away: 41.49% / 23.63% / 34.84%
- Over 2.5: 60.58%
- BTTS: 62.47%
- Raw/headline modal: 1–1 at 10.66%
- C0166 source records cross-season L5 for both clubs.
- Defect: inherited signed team-specific adjustments can become mirrored modal sentences without displaying magnitudes or net effect.

## 4. L5/L10/L20 inventory

### 4.1 Direct production effect

Only one L10-bearing object is registered with direct production effect:

- `private.refresh_c0159_production_fixture_forecasts_v01`
  - lifecycle: PRODUCTION
  - canonical status: CANONICAL
  - active production effect: true
  - consumes:
    - `recent_attack_xg_l10`
    - `opponent_recent_defence_xga_l10`
  - minimum recent sample: 5
  - recent-form cap: ±0.03 log
  - total cap: ±0.06 log
  - source features are rolling league history and can cross seasons.

This is the canonical cross-season L10 bypass requiring P1 replacement.

### 4.2 Inherited production path

```text
generate_fixture_team_feature_snapshots_v01
  → team_history L5/L10 features
  → c0159_form_log_v01
  → refresh_c0159_production_fixture_forecasts_v01
  → C0159 snapshot / signed reason manifest
  → refresh_c0166_production_fixture_forecasts_v01
  → current_production_fixture_prediction_v01
  → generate_upcoming_fpl_projection_core_v01
  → goal/assist lambdas and event distribution
  → model_predictions
  → optimizer / captaincy / C0248 / C0277 / C0276
```

C0166 adds a second cross-season path:

- `private.c0166_fixture_evidence_adjustments_v01`
- input `symmetric_l5_xg_matchup`
- formula explicitly combines L5, current season, venue, streak and residual terms.
- diagnostics admit `cross_season_l5_home=true` and `cross_season_l5_away=true` for GW5 examples.

### 4.3 Explanation path

- `private.c0214_add_parent_c0159_explanatory_candidates_v01`
  - reads inherited C0159 reasons;
  - converts L10 attack/defence inputs into human sentences;
  - currently exposes opaque “last 10 league matches” language.
- `private.c0166_rebuild_explanatory_candidates_v01` and related fact/audit functions expose L5-based C0166 evidence.

Therefore the UI contradiction is not isolated presentation logic: the modal reflects two inherited calculation paths, while omitting net materiality and reconciliation.

### 4.4 L20 inventory

L20 references exist in:

- `public.generate_blind_gw_v03`
- `public.generate_forward_team_strength_candidate_v02`
- `public.generate_forward_team_strength_candidate_v03_elo`

None is registered with direct production effect. They are infrastructure/research paths. P1 must keep them zero-effect and prevent their promotion/reuse. C0279 does not migrate or restore L20.

### 4.5 Other L5/L10 infrastructure

Additional active supporting/historical/uncertainty objects retain L5/L10 for archives, research, coverage diagnostics or legacy features. They require disposition labels in P1:

- production input to replace;
- explanation input to replace;
- research-only retained;
- historical archive retained;
- uncertainty-only reviewed;
- retire after consumer proof.

Code existence is not production effect.

## 5. Forecast-to-player consumption map

The live dependency registry proves:

```text
current_production_fixture_prediction_v01
→ generate_upcoming_fpl_projection_core_v01
→ fpl_adjusted_team_lambda_v01
→ fpl_fixture_goal_lambda_v03
→ fpl_fixture_assist_lambda_v03
→ fpl_current_event_distribution_v01
→ model_predictions
```

The same fixture selector is also consumed by:

- C0213 lineage/readiness/provenance;
- C0242 captaincy equivalence gate;
- C0276 fixture signature, projection lineage and convergence;
- current fixture fact candidates.

Thus C0279 season-state changes will propagate to player xPts, clean-sheet and haul distributions, captaincy, optimizer and final decision governance. P1 must preserve exact lineage and invalidate/re-prove definition-bound behavioral tests.

## 6. P0 findings

1. The problem is calculation-level and presentation-level.
2. Cross-season L10 has a canonical production bypass through C0159.
3. Cross-season L5 independently affects C0166.
4. C0166 inherits C0159 reasons, so replacing only modal wording would leave calculations unchanged.
5. L20 is not currently a production-effect component; it must remain excluded.
6. The raw-modal selector is distribution-blind when choosing the representative headline.
7. Fixture state already reaches player projections and captaincy, but no explicit score-family → conditional player-return contract exists.
8. Current evidence audits check alignment/lineage but do not enforce net materiality, same-family contradiction rejection or viewer-level reconciliation.
9. P1 can extend the canonical path; no new parallel fixture authority is necessary.

## 7. P1 implementation boundary

P1 should create one canonical season-state contract and integrate it into the existing C0159/C0166 production path in shadow first.

It must:

- implement the registered 40/60 → 100/0 season schedule;
- separate structural/tactical/availability modifiers;
- remove cross-season L10 and L5 bypasses from the shadow candidate;
- leave L20 excluded;
- expose current-season sample, previous-season weight and signed contributions;
- preserve the current production selector until shadow equivalence and promotion gates pass;
- add test vectors for samples 1–10;
- produce diagnostic comparisons for matches 41 and 45;
- prove no historical rewrite and no unauthorized downstream selection.

## 8. P0 exit gate

- GW5 evidence frozen and hashed: PASS
- Diagnostic fixtures preserved: PASS
- Direct production L10 path identified: PASS
- Cross-season L5 path identified: PASS
- L20 production effect checked as absent: PASS
- Forecast-to-player/captaincy consumer chain mapped: PASS
- Duplicate/parallel authority required: NO
- Production behavior unchanged: PASS
- Ready for P1: YES
