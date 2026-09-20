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

## Consumer cutover verification

- `fpl-api` v19 reads `current_fixture_decision_contract_v01` and exposes the canonical result, complete scoring distribution, near-tie state, representative score, raw modal score and decision hash.
- `fixture-facts-api` v8 aligns evidence to the canonical snapshot and leaves no-edge evidence neutral instead of coercing it to DRAW.
- V3 no longer derives scoring environments from lambdas, applies a boundary override, or converts no-edge to DRAW. Match and history surfaces use the canonical result and representative score, disclose the full Low/Normal/High distribution, and label lambdas as projected goals.
- GW6 live API verification returned 10/10 contract rows, one contract version, three blended near-ties, and zero missing representative/raw/hash fields.
- Frontend typecheck, 20/20 domain tests and production build passed.

## Gate status

P3 is verified and closed. Publication remains blocked. P4 immutable freeze, mixed-lineage prevention and fail-closed publication authorization are next.

### Post-close parity repair

Pages run #986 correctly blocked a legacy V2 mismatch: Betting exposed the representative headline while FPL's compatibility `headline_score` field was absent. The assertion was preserved. Production `fpl-api` v21, `betting-api` v13 and `human-insights-api` v3 now all read the canonical contract and return identical snapshot/headline pairs across 10/10 live GW5 fixtures. This repair changes no forecast and does not reopen model selection.
