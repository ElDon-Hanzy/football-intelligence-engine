# C0279 P3 — Scoring-Environment Shadow Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-17  
**Production effect:** Zero (shadow only)  
**Next phase:** P4 — score-family shadow selector

## Outcome

P3 adds:

- `private.c0279_scoring_environment_classify_v01(jsonb,numeric,numeric,jsonb)`
- `private.c0279_scoring_environment_snapshot_v01(bigint)`

The classifier consumes the complete score matrix and produces normalized LOW/NORMAL/HIGH memberships, goal bands, BTTS/over-2.5 context and subtype probabilities. The isolated modal cell is diagnostic only.

## Environment contract

Primary environments:

- `LOW_SCORING`
- `NORMAL_SCORING`
- `HIGH_SCORING`

Subtypes:

- Low: stalemate, narrow win, defensive control
- Normal: balanced draw, conventional narrow win
- High: high-scoring draw, shootout, attacking dominance, demolition

Shootout and demolition are explicitly children of `HIGH_SCORING`.

Fuzzy goal memberships are aggregated over every matrix cell. A two-percentage-point near-tie rule resolves distributions with 2.6–3.0 expected goals to NORMAL, preventing rounding-level LOW/HIGH flips. Missing or under-covered matrices fail closed as `INSUFFICIENT_EVIDENCE`.

## Verification

Boundary vectors:

| Vector | Expected | Actual | Result |
|---|---|---|---|
| 0.7–0.6 lambda | LOW | LOW / stalemate | PASS |
| 1.4–1.3 lambda | NORMAL | NORMAL / balanced draw | PASS |
| 2.0–1.8 lambda | HIGH | HIGH / shootout | PASS |

- Membership probabilities sum to one: PASS
- Missing matrix fails closed: PASS
- Shootout parent is HIGH: PASS
- Demolition parent is HIGH: PASS
- Raw modal cell is diagnostic: PASS
- Matrix coverage on diagnostics exceeds 99.9%.

## Diagnostic fixtures

| Fixture | Environment | LOW | NORMAL | HIGH | Subtype | xG total | O2.5 | BTTS | P(5+) |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|
| Brentford–Chelsea | HIGH | 23.7% | 32.9% | 43.4% | Shootout | 3.31 | 64.3% | 65.4% | 23.9% |
| Leeds–Crystal Palace | HIGH | 26.6% | 33.7% | 39.7% | Shootout | 3.13 | 60.6% | 62.5% | 20.7% |

Both retain 1–1 as the raw modal cell, but neither is summarized as a low-scoring match.

## Integrity

- P1/P2 hashes unchanged.
- C0159 hash unchanged: `51f2d41adadedc4db48f0c4de424a7c4`
- C0166 hash unchanged: `1cf4bef45f0a0cd78eadf6d5d9814dc2`
- No forecast, player, historical, captaincy or execution row written.
- No production selector changed.
- Supabase advisors found no C0279-specific issue.
