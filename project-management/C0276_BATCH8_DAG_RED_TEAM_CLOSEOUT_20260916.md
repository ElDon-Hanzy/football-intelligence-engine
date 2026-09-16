# C0276 Batch 8 — DAG Contract + C0233 Red-Team Closeout

Date: 2026-09-16

## Finding
The live dependency DAG had drifted from the actual governed runtime contract: STRUCTURAL, FORWARD, OR_UTILITY and RED_TEAM still declared OPTIMIZER as their only dependency. C0233 itself consumes ensemble, structural, forward, OR-utility and team-regime artifacts. Leaving this mismatch would make a future generic convergence controller unsafe.

## Change
Migration `c0276_batch8_dag_contract_and_red_team_dispatch` aligned represented dependencies to the governed chain and expanded downstream invalidation sets. It also added an idempotent C0233 request ledger and fail-closed dispatcher.

## Production proof
Cycle #2 request #7193 -> HTTP 200 -> red-team run #12. Exact lineage: ensemble #12, structural #10, forward #10, OR utility #12, team-regime shadow #3. Artifact was created after dispatch and reports `RED_TEAM_READY`; historical forecasts were not rewritten. RED_TEAM was reconciled READY only after proof.

C0233's substantive result is `EDGE_NOT_ROBUST`. This is intentionally preserved for downstream governance; no attempt was made to turn it into a recommendation or bypass it.

## Safety
No transfers, chips or publication. C0240 concurrency unchanged. C0265 unchanged. No decision/noise gate relaxation.

## Next
Verify the canonical ADVER​SARIAL runtime and its real dependency contract. Preserve the red-team high-severity challenge fail-closed.