# C0276 — Autonomous Decision Orchestration — Governed ENSEMBLE Dispatch Batch

Date: 2026-09-16

## Production state inspected
Cycle #2 / GW5 was READY through OPTIMIZER run #34. ENSEMBLE remained stale; latest C0228 ensemble artifact was run #10 from 2026-09-15. Production Edge Function `fpl-autonomy-ensemble` exists and is ACTIVE v2 (`C0228_ENSEMBLE_AGGREGATOR_V02_SEQUENTIAL`). The prior conclusion that no canonical C0228 worker existed was therefore incorrect: the missing component was a governed Decision-Cycle dispatcher, not the worker itself.

## Changes
Added `private.c0276_ensemble_requests` and `private.c0276_dispatch_ensemble_v01(cycle_id)`.

The dispatcher is cycle/optimizer-lineage keyed, advisory-lock protected and idempotent. It refuses dispatch unless OPTIMIZER is READY, calls only the existing C0228 worker, records the pg_net request, marks ENSEMBLE RUNNING, and explicitly remains non-decisioning / non-manager-plan-writing. It does not mutate historical forecasts.

## Production acceptance
Cycle #2 dispatched ENSEMBLE request #7164 against optimizer run #34 with signature `a11bfa0e2517d8aab99c67d1bec46b20`. At bounded-batch close, pg_net had not yet returned a response, so ENSEMBLE correctly remains RUNNING and was not promoted READY.

## Governance
No FPL transfer/chip execution. No publication. No decision/noise gate weakening. C0240 concurrency unchanged; no 5-worker test. Historical forecast immutability preserved.

## Exact next batch
Reconcile request #7164. On HTTP/worker success, verify the returned ensemble run is current to Cycle #2 / optimizer #34 before READY promotion. On failure/timeout, mark FAILED and exercise idempotent retry/recovery. Then advance only to STRUCTURAL. Add generalized retry/backoff/deadline metadata after this first governed downstream recovery path is proven.
