# C0279 P2 — Bounded Acceleration / Regime Shadow Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-17  
**Production effect:** Zero (shadow only)  
**Next phase:** P3 — scoring-environment shadow

## Outcome

P2 adds:

- `private.c0279_acceleration_classify_v01(...)`
- `private.c0279_team_acceleration_asof_v01(bigint,timestamptz,integer)`

The layer compares the most recent two current-season matches with earlier current-season evidence, uses the P1 season-state contract for opponent-quality normalization, separates process change from finishing variance, and can only alter future distribution tails/uncertainty after promotion. It cannot replace the canonical baseline.

## Classification contract

- `PROCESS_IMPROVEMENT`
- `FINISHING_ONLY_SPIKE`
- `TACTICAL_REGIME_CHANGE`
- `WEAK_OPPONENT_INFLATION`
- `UNEXPLAINED_NOISE`
- `INSUFFICIENT_EVIDENCE`

A tactical-regime label requires verified external tactical/personnel evidence. The current canonical feed does not yet provide chronology-safe change events, so the as-of wrapper exposes `regime_evidence_available=false` rather than inventing a regime claim.

## Controls

- Minimum two recent plus two earlier current-season matches.
- Opponent-adjusted xG process via the P1 contract.
- Shot-volume persistence.
- Explicit finishing residual: change in goals minus xG.
- Weak-opponent damping.
- Tail log cap: 0.04; current process cap: 0.03.
- Finishing-only spikes receive zero positive tail adjustment.
- `baseline_replacement_allowed=false` in every class.
- Missing evidence remains unknown.
- Private security-invoker functions; no anonymous/authenticated execution.

## Verification

Synthetic classification vectors: **6/6 passed**.

Perturbation gates:

- isolated scoreline with flat process → finishing-only, zero tail uplift: **PASS**
- identical process improvement against weak opponents receives smaller tail effect: **PASS**
- very large opponent-adjusted xG improvement with non-declining shots is not rejected by a rigid 10% shot threshold: **PASS**
- baseline replacement is impossible: **PASS**

## Diagnostic fixtures

| Team | Classification | Key reading | Tail log | Confidence |
|---|---|---|---:|---:|
| Leeds | PROCESS_IMPROVEMENT | Opponent-adjusted attack +141%; xG 0.81→2.26; shots +8.7%; finishing residual stable | +0.030 | 0.75 |
| Crystal Palace | FINISHING_ONLY_SPIKE | Goals +2.0 per match, but opponent-adjusted attack −22%; finishing residual +1.93 | 0.000 | 0.80 |
| Brentford | UNEXPLAINED_NOISE | Attack process −55%; shots −58%; mixed finishing residual | 0.000 | 0.35 |
| Chelsea | UNEXPLAINED_NOISE | Attack process −43%; shots −29%; no recent acceleration | 0.000 | 0.35 |

These are P2 diagnostics, not promoted forecast adjustments.

## Integrity

- P1 function hashes unchanged.
- C0159 hash unchanged: `51f2d41adadedc4db48f0c4de424a7c4`
- C0166 hash unchanged: `1cf4bef45f0a0cd78eadf6d5d9814dc2`
- No forecast, player, historical, captaincy or execution row written.
- No production selector changed.
- Supabase advisors found no C0279-specific issue.
