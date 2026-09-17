# C0279 P4 — Score-Family Shadow Selector Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-17  
**Production effect:** None (private shadow contract only)  
**Next phase:** P5 conditional player-return bridge

## Outcome

P4 replaces “largest isolated exact-score cell = headline” in shadow evaluation with a full-matrix football-family selector. It preserves the raw modal cell as a diagnostic reference, selects a family compatible with the P3 LOW/NORMAL/HIGH environment, then chooses a representative exact score aligned with the dominant 1X2 direction where the family permits it.

No production forecast, historical prediction, player projection, captaincy decision, chip decision, UI consumer or external execution path was changed.

## Contract

Private functions:

- `private.c0279_score_family_classify_v01(jsonb,text,jsonb,text)`
- `private.c0279_score_family_snapshot_v01(bigint)`

Families are mutually exclusive across the complete score matrix:

- LOW_SCORING_PARITY
- HIGH_SCORING_PARITY
- SHOOTOUT
- NARROW_HOME_WIN / NARROW_AWAY_WIN
- COMFORTABLE_HOME_WIN / COMFORTABLE_AWAY_WIN
- HOME_DEMOLITION / AWAY_DEMOLITION (display group: DEMOLITION)

Shootout is a high-scoring family. Environment eligibility is enforced before headline selection. Direction strength is disclosed as STRONG, SLIGHT or NO_MEANINGFUL_EDGE. A weak direction or a family/direction conflict explicitly sets uncertainty disclosure. Matrix coverage below 95%, missing matrices or unsupported environments fail closed as INSUFFICIENT_EVIDENCE.

## Diagnostic fixtures

| Fixture snapshot | Environment | Selected family | Family probability | Representative headline | Exact-cell probability | Raw modal reference | Raw-cell probability | Direction |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Brentford–Chelsea (9084) | HIGH_SCORING | SHOOTOUT | 14.9264% | 3–2 | 3.9212% | 1–1 | 9.9793% | Brentford, slight |
| Leeds–Crystal Palace (9090) | HIGH_SCORING | SHOOTOUT | 12.8461% | 3–2 | 3.5831% | 1–1 | 10.6686% | Leeds, slight |

The representative cell is not claimed to be individually more probable than 1–1. It is the direction-coherent member of the leading eligible aggregate family. The modal now exposes both facts instead of allowing the isolated 1–1 mode to conceal a high-scoring fixture distribution.

Both diagnostic family distributions reconcile to 1.000000 after normalization. Matrix coverage is 99.9328% and 99.9523%, respectively. Evidence hashes:

- 9084: `c01e83119607025c7c096a268a301923c2a95b1d9c14438f15cc0be67f9cff98`
- 9090: `3fe95eeb706acb9d3dca1f4b4f268f87db68493965dae7c9e9f0ad1f3bdae065`

## Validation

- Synthetic LOW vector (0.7/0.6 lambda): LOW_SCORING_PARITY, 0–0.
- Synthetic NORMAL vector (1.4/1.3): LOW_SCORING_PARITY, 1–1, direction conflict disclosed.
- Synthetic HIGH vector (2.0/1.8): SHOOTOUT, 3–2.
- Full GW5 ten-fixture sweep: every selected family is environment coherent.
- Direction conflict in snapshot 9085 is retained and explicitly disclosed rather than hidden.
- Empty matrix returns one INSUFFICIENT_EVIDENCE row with 0 coverage.
- Family probabilities reconcile to approximately 1 within score-matrix truncation/rounding.
- Public, anon and authenticated roles have no execute privilege.
- P3 scoring-environment function hashes remained unchanged.
- Supabase security and performance advisors produced no C0279-specific finding; existing project-wide informational findings remain outside this phase.

## Integrity and governance

- Full exact-score distribution consumed; raw modal retained.
- No L10/L20 input introduced.
- No parallel forecast or captaincy authority created.
- Historical rows remain append-only.
- P4 remains shadow-only pending P8 evaluation and P9 promotion authorization.
- C0248, C0277, C0276 and final authorization gates remain unchanged.

## Implementation

Migration: `supabase/migrations/20260917190000_c0279_p4_score_family_shadow_selector.sql`

P4 gate is satisfied for implementation correctness, reconciliation, coherent headline behavior and fail-closed handling. Calibration improvement remains a prospective P8 evaluation question and is not asserted from these diagnostics.

## Final architecture verification

Post-reconciliation C0213 governance is green:

- system consolidation: true
- registry integrity: true
- production behavioral proof: 14/14
- required capabilities: 19/19
- tracker consumption governance: 100/100, zero violations
- tracker audit: zero bad IDs, unverified completions, missing references or consumption violations
- active duplicate cron targets: zero
- production-effect components remain 14

C0279 tracker state is `P4 Verified`, phase `P4 complete — P5 conditional player-return bridge pending`, with model effect still explicitly zero until validation and promotion.
