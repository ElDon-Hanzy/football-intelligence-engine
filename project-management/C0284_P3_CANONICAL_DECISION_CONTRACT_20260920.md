# C0284 P3 — Canonical Decision Contract

## Outcome

The production database now exposes `public.current_fixture_decision_contract_v01`, sourced only from the active fixture selector. No forecast snapshot was updated or deleted.

The contract makes the complete Low/Normal/High probability distribution canonical, labels a top-two gap below two percentage points as `BLENDED_NEAR_TIE`, keeps Shootout and Demolition as High-scoring subtypes, and returns `NO_MEANINGFUL_EDGE` as its own result decision rather than coercing it to DRAW. It also separates the raw modal score from the outcome-coherent representative score.

## Production verification

- GW6 coverage: 10/10 fixtures.
- Contract tests: 6 passed, 0 failed.
- Minimum score-matrix coverage: 0.998341.
- Maximum Low+Normal+High sum error: 0.000001.
- No-edge converted-to-draw violations: 0.
- Missing raw or representative scores: 0.
- Representative score differs from the raw modal score in 10/10 GW6 fixtures, proving the fields are not aliases.
- GW6/GW7/GW8 each expose 10 active rows; near-tie counts are 3/2/4.

## Gate status

The database portion of P3 is green. P3 is not closed and publication remains blocked until every API, FPL and V3 UI consumer reads this contract and deployed parity is proven. P4 freeze/lineage work follows that consumer cutover.
