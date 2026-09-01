# C0159 — Bounded matchup, prematch evidence and match-script production promotion

Date: 2026-09-01
Status: Production verified (bounded derivative)
Parent: C0147

## Decision

The user explicitly approved promoting the useful parts of C0147 and C0154 and making `Why This Call?` evidence genuine pre-match model inputs.

This is **not** a claim that the original C0147/E0011 or C0154 research gates have statistically passed. Their frozen research artifacts remain unchanged. C0159 is a new, prospective, bounded production derivative with its own audit trail.

## Production contract

1. Start from the latest chronology-valid structural fixture forecast.
2. Apply the frozen C0147 `COMBINED_V01` log-lambda signal at **35% production weight**.
3. Cap the live C0147 contribution and the total signed log adjustment so the new layer cannot dominate the structural model while forward evidence matures.
4. Add current pre-match recent-attack xG and opponent recent-defence xGA only when sample coverage is adequate. Missing evidence contributes no effect; it is never imputed as observed zero.
5. Persist every signed production contribution in `fixture_prediction_snapshots.reason_manifest`.
6. `Why This Call?` may expose only facts that are present in the pre-kickoff snapshot and made an actual signed model contribution.
7. Rebuild the full Poisson score matrix from the adjusted lambdas.
8. Preserve the raw modal score and its probability.
9. Apply the C0154-inspired match-script headline selector only when the dominant 1X2 outcome conflicts with the raw modal outcome, the outcome edge is at least 8 percentage points, and the best score consistent with the dominant script is within 2 percentage points of the raw modal score probability.
10. Otherwise retain the raw modal score. The probability matrix is never cosmetically rewritten to create score diversity.

## Persisted fixture fields

`fixture_prediction_snapshots` now carries:

- `headline_score`
- `headline_score_probability`
- `raw_modal_score`
- `raw_modal_probability`
- `script_family`
- `script_confidence`
- `reason_manifest`

The source snapshot records `change_id=C0159`, the parent structural snapshot, C0147 prediction id, input feature snapshot ids, signed adjustments, selector rule and a production input signature.

## Refresh plumbing

Cron job `c0159_production_fixture_refresh` is active at minutes 03/18/33/48 each hour and refreshes the next two future FPL gameweeks. The append-only fixture snapshot policy remains in force.

## GW3 verification

At 2026-09-01 01:07 UTC C0159 produced current production snapshots for all 10 GW3 fixtures. All target fixtures were pre-kickoff and `actual_data_used_for_target_fixture=false`.

Examples:

- Ipswich–Liverpool: raw modal `1-1`; dominant script AWAY; headline `1-2` because the away-win thesis was strong and the `1-2` cell was only about 0.22 percentage points below the raw modal cell.
- Brentford–Sunderland: raw modal `1-1`; dominant script HOME; headline `2-1`.
- Arsenal–Chelsea: raw modal `1-1` at about 10.46%; HOME script about 57.8%; headline `1-0` at about 10.23%. The matrix remains untouched and both values are retained for audit.
- Newcastle–Bournemouth and Fulham–Palace retained `1-1` because the outcome edge was not strong enough.

## Integrity

- No frozen historical forecast was updated.
- C0147/E0011 rows remain `model_effect_enabled=false` research records.
- C0154 historical/proxy research remains unchanged.
- C0159 is future-only and append-only.
- Missing data is not zero.
- The bounded derivative is explicitly distinguishable from a statistically validated full promotion.
