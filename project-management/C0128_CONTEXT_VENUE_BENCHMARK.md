# C0128 — Context-specific venue effect benchmark v0.1

## Scope
Retrospective research only. This change tests whether recent home/away-specific xG history should modify a generic recent-form xG baseline. It does not alter frozen W0001/A0005, E0007 or W0002, and `model_effect_enabled=false` throughout.

## Fixed candidates
For each chronology-safe team-side observation with full L10 coverage, the baseline is the mean of own generic L10 xG-for and opponent generic L10 xG-against. Venue candidates replace 25%, 50% or 100% of that baseline with the analogous home/away-specific L10 values. Candidate definitions were fixed before holdout scoring. Missing venue values are excluded, never coerced to zero.

## Historical chronological benchmark
| Window | n | BASE MAE/RMSE | VENUE25 | VENUE50 | VENUE100 |
|---|---:|---|---|---|---|
| 2024/25 eligible tail | 312 | 0.663937 / 0.835744 | 0.665557 / 0.834499 | 0.671427 / 0.837413 | 0.693777 / 0.855490 |
| Aug–Dec 2025 | 234 | 0.681140 / 0.835537 | 0.675560 / 0.825465 | 0.673892 / 0.820472 | 0.677992 / 0.825997 |
| Jan–Feb 2026 | 130 | 0.648711 / 0.797434 | 0.653188 / 0.799156 | 0.660291 / 0.805313 | 0.681094 / 0.830465 |
| Mar–May 2026 | 152 | 0.673084 / 0.873298 | 0.670955 / 0.869460 | 0.671091 / 0.868953 | 0.678294 / 0.877920 |

No venue formulation improves both MAE and RMSE consistently across chronological windows. The apparent benefit in Aug–Dec and Mar–May reverses in Jan–Feb and is absent in 2024/25.

## Retrospective GW1 diagnostic — not independent validation
Using only pre-GW1 Understat history to construct the same fixed candidates, and revealing realized GW1 xG separately afterward, only six team-sides currently have complete realized-xG coverage in the available source. Results: BASE 1.039997 / 1.263380 MAE/RMSE; VENUE25 1.024522 / 1.226125; VENUE50 1.009048 / 1.191170; VENUE100 0.978099 / 1.129000.

This tiny GW1 result is explicitly retrospective and cannot override the larger mixed chronological evidence. It is not independent validation and is not used to tune a new venue weight.

## Decision
`REJECT_NO_CROSS_WINDOW_STABILITY`.

Do not add a blanket or fixed context-specific venue uplift to the active model from this evidence. C0106 can be closed as a verified negative research decision. Any future venue work should require a genuinely different hypothesis (for example interaction with calibrated strength or structural home/away style) under a new Change ID and must still pass forward validation before activation.

## Production evidence
- Experiment key: `E0011`
- Table: `public.venue_context_benchmarks`
- Status function: `private.venue_context_benchmark_status_v01()`
- 20 append-only benchmark rows: 16 historical + 4 GW1 diagnostic
- Mutation guard rejects update/delete
- RLS enabled; anon/authenticated grants revoked
- `model_effect_enabled=false`
