# C0284 P5 — Decision-Evidence Reconstruction Closeout

Date: 2026-09-21  
Status: Verified  
Production effect: explanation API only; publication remains blocked

## Delivered contract

`fixture-facts-api` v11 serves `c0284_decision_evidence_v01`, pinned to each canonical fixture snapshot. Every GW6 fixture provides:

- five explicit decision targets;
- four genuine attack/defence model inputs with non-zero signed contributions;
- current-season record, scoring, conceding and qualifying streak evidence as zero-effect observed context;
- process-versus-results evidence using the promoted state xG rate and explicit integrity-view coverage;
- targeted risks, reliability, conflict synthesis and a concise conclusion;
- a bounded player implication that cannot authorize publication before P7 lineage.

Model outputs are not repeated as independent evidence. Research/context rows have `model_effect_enabled=false`, weight `0` and signed contribution `0`.

## Production verification

- Fixtures: 10/10.
- Decision targets: 5/5 per fixture.
- Signed model inputs: 4/4 per fixture.
- Observed facts: 9–13 per fixture.
- Prediction-state sample reconciliation: 10/10.
- Targeted-risk audit: 10/10.
- Non-authorizing player implication: 10/10.
- Two independent live calls: identical evidence hashes for 10/10 fixtures.
- xG coverage: explicit 4/5 or 5/5; missing values are never represented as zero.

## Preserved gates

GW6 freeze `1` remains immutable with 10 fixtures. The authorized surface still returns zero rows with `DECISION_CYCLE_MISSING` and `PLAYER_PREDICTION_RUN_MISSING`. P5 did not mutate historical forecasts or C0265 and did not create placeholder lineage. P6 must prove API/UI parity; P7 must bind the frozen fixture, player and FPL decision-cycle lineages before publication.
