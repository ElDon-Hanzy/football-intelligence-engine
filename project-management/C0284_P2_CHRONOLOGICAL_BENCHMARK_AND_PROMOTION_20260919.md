# C0284 P2 — Chronological Benchmark and Promotion

**Status:** Completed / Verified  
**Decision:** Promote `forward_fixture_v0.3.0_c0284_current_season`  
**Rollback:** `production_fixture_v0.3_c0166` snapshots remain append-only

## Evaluation discipline

- One common FPL deadline cutoff was used per Gameweek. Later matches in the same Gameweek did not receive post-deadline information.
- GW2 C0166 comparison is unavailable because C0166 did not yet exist. This is recorded as unavailable, not reconstructed or scored as zero.
- The primary incumbent comparison uses the 20 fully settled common fixtures in GW3-GW4.
- Only six GW5 fixtures were settled; those results are confirmatory and carry zero primary promotion weight.
- Historical candidate rows are labelled retrospective chronology-safe replay, not prospective validation.

## Candidate correction

The original current-season candidate produced excessive early-season lambda dispersion. The correction adds two neutral pseudo-matches at the **current-season league mean** when estimating current-season attack and defence rates. This is sampling reliability, not previous-season weight.

Previous-season contribution remains exactly 25/25/25/25/20/15/10/5/0% through matches 1-9+, independent of promotion status or prior source. L5, L10 and L20 are not consumed.

## Common GW3-GW4 result

| Metric | C0284 candidate | C0166 | Candidate regression |
|---|---:|---:|---:|
| Exact-score log loss | 2.8934 | 2.8878 | 0.19% |
| 1X2 Brier | 0.6789 | 0.6780 | 0.13% |
| Team-goal MAE | 0.9111 | 0.8972 | 1.55% |
| Total-goal MAE | 1.5799 | 1.5555 | 1.57% |
| Family Brier | 0.6459 | 0.6446 | 0.20% |

All primary metrics are inside the predeclared 2% non-inferiority limit. The compliant candidate is therefore promoted because it removes the prohibited cross-season rolling inputs while retaining incumbent-level predictive performance.

## Additional evidence

- Candidate GW2-GW4 exact-score log loss: 2.9731 after regularization, versus 3.0223 unregularized and 3.1599 for the current-only unsmoothed control.
- Partial GW5 exact-score log loss: candidate 3.1773, C0166 3.1799. Other partial-GW5 metrics are mixed, so no claim of superiority is made.
- Direct Low/Normal/High winner classification still collapses toward Normal for both models. This is a P3 family-contract defect, not a reason to retain C0166.

## Production verification

- Edge function deployment: version 4, JWT platform verification disabled by design, custom engine-token authentication retained.
- GW6-GW8: 10/10 active fixtures per Gameweek now use `forward_fixture_v0.3.0_c0284_current_season`.
- All active rows declare L5/L10/L20 consumption false.
- Active prior weights are 20-25% because teams currently have four or five completed matches; the scheduler will advance the canonical decay after results arrive.
- Scheduler job 6 remains active. Superseded C0166 writer job 20 is paused through `cron.alter_job`; its snapshots remain available for rollback.
- Forecasts remain `frozen=false`; P4 owns freeze and publication authorization.

## Promotion boundary

This promotion authorizes the fixture generator only. It does not authorize public next-GW publication. P3 family/no-edge, P4 freeze/lineage, P5 evidence, P6 UI parity and P7 player/FPL lineage remain blocking.
