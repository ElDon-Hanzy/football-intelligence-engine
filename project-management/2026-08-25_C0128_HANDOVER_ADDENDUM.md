# 2026-08-25 handover addendum — C0128

C0128 tested context-specific venue weighting as a retrospective research hypothesis under experiment E0011. Fixed 25%, 50% and 100% venue-specific blends were compared with a generic L10 baseline across four chronological windows. No venue formulation improved both MAE and RMSE consistently, so the decision is `REJECT_NO_CROSS_WINDOW_STABILITY`.

A separate retrospective GW1 diagnostic was run with chronology-safe pre-GW1 history and later-revealed realized xG. Only six team-sides had complete realized-xG coverage; venue weighting looked better on that tiny sample, but this is explicitly not independent validation and did not change the decision or trigger tuning.

Production persistence: `public.venue_context_benchmarks` (20 append-only rows), `private.venue_context_benchmark_status_v01()`, mutation guard, RLS enabled, no anon/authenticated grants, and `model_effect_enabled=false`.

Frozen forward state was rechecked after implementation: A0005 remains 140 predictions / 20 fixtures / 0 evaluations with zero integrity violations. W0002 remains 20 fixtures / 0 evaluations with zero integrity violations. E0007 was not modified.

C0106 is now satisfied as a negative research decision: blanket home uplift was already rejected, and the tested fixed context-specific venue blends also lack cross-window stability. Future materially different venue hypotheses require a new Change ID.
