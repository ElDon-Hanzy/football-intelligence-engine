# C0279 P1 — Canonical Season-State Contract Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-17  
**Production effect:** Zero (shadow only)  
**Next phase:** P2 — bounded acceleration/regime shadow

## Outcome

P1 implements one versioned, chronology-safe shadow contract for current-season versus previous-season performance evidence:

- `private.c0279_season_performance_weights_v01(integer)`
- `private.c0279_team_season_state_asof_v01(bigint,timestamptz,integer)`

The contract exposes the actual current-season sample, approved current/prior weights, raw inputs, blended xG/xGA, completeness, chronology, prior source, source state/hash and a deterministic evidence hash.

## Contract behavior

- Approved weights are exact for samples 1–8 and become 100/0 from sample 9.
- Sample 0 is prior-only; null and negative samples fail closed.
- Required missing inputs return an unknown blend (`NULL`), never zero.
- Source state must predate target kickoff.
- Structural/tactical/availability modifiers are explicitly orthogonal and unapplied.
- Cross-season L5, L10 and L20 flags are false inside the canonical contract.
- Legacy source fields are lineage only and do not enter the new blend.
- Functions are private, security-invoker, and not executable by `PUBLIC`, `anon` or `authenticated`.

## Verification

### Weight vectors

Samples 0–10: **11/11 passed**.  
Sample 9 and 10: previous-season weight **0%**.  
Null/negative samples: **fail closed**.

### Diagnostic fixtures

| Match | Team samples | Weights | Chronology | Complete | L5/L10/L20 blocked |
|---|---:|---:|---|---|---|
| Brentford–Chelsea (41) | 4 / 4 | 75/25 | PASS | PASS | PASS |
| Leeds–Crystal Palace (45) | 4 / 4 | 75/25 | PASS | PASS | PASS |

Shadow blended xG/xGA:

- Brentford: 1.825038 / 1.477893
- Chelsea: 1.470227 / 1.464246
- Leeds: 1.513604 / 1.343895
- Crystal Palace: 1.469132 / 1.952891

These are state-contract diagnostics, not promoted fixture lambdas.

### Integrity

- C0159 definition hash unchanged: `51f2d41adadedc4db48f0c4de424a7c4`
- C0166 definition hash unchanged: `1cf4bef45f0a0cd78eadf6d5d9814dc2`
- No fixture/player/history rows written.
- No production selector changed.
- No external FPL execution.
- Supabase advisors reported no C0279-specific security or performance finding; existing project-wide advisory backlog remains outside this phase.

## Gate disposition

P1 gate is satisfied for the shadow contract: versioned state, explicit weights and samples, chronology protection, missing-data fail-closed behavior, lineage and legacy-window exclusion are proven.

Production-wide consumption is deliberately deferred to the promotion/integration phases. P1 does not claim that existing C0159/C0166 production paths have been replaced.
