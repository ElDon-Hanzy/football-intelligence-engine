# C0281 — Deadline Convergence & Finalization Protocol — Closeout

Date: 2026-09-18
Status: Completed / Verified

## Purpose
Repair the GW5 deadline-convergence failure without weakening FPL decision governance. Live Supabase evidence outranks documentation.

## Incident summary
GW5 exposed interacting failures: projection/readiness paths could consume the 120s statement timeout; asynchronous HTTP failures could remain RUNNING; successful HTTP responses could remain uncaptured; raw fixture/player lineage changes repeatedly reopened downstream work; T-2 was a priority label rather than a completion SLA; there was no empirical runtime reservation or coherent-lineage fallback.

The emergency cron freeze did not cause the original defects. Production evidence showed a projection timeout before the freeze.

## Implemented phases
- P0 restored the two emergency-unscheduled crons, duplicate-safe. Production jobs are now C0276 tick job40 */5, projection horizon job41 */15, optimizer orchestration job42 at 12,27,42,57.
- P1 reconstructed the GW5 incident chronology and root causes.
- P2 added asynchronous HTTP terminal reconciliation: non-2xx => FAILED; missing response >300s => FAILED; HTTP 2xx still uncaptured >300s => FAILED, all under governed retry accounting.
- P3 removed the observed readiness bottleneck with targeted indexes; c0166 audit fell to ~0.41s in validation and fresh-skip snapshot/readiness completed ~1.76s. This is not a claim that a full 604-player projection takes 1.76s.
- P4 added T-4 lineage stabilization. Player-state changes remain immediately material. Fixture signature churn is debounced until two observations or five minutes. This is conservative stabilization, not semantic xPts-delta materiality.
- P5 introduced NORMAL -> T4_BASELINE -> T4_BASELINE_CONVERGED -> T2_DELTA -> CLOSED. T-4 is the baseline-convergence point; T-2 is a delta phase.
- P6 reused existing C0248/C0243 price timing. Price never creates a football transfer and may only accelerate an already robust transfer if affordability is materially threatened. GW5 Palmer->Saka had no material next-update affordability risk.
- P7 added empirical runtime SLAs from 14-day production history. At closeout: projection P99 ~46.6s; optimizer orchestration P99 ~49.4s; C0276 control tick P99 ~120.0s. Runtime reservation is max(300s, 2*E2E P99 + 60s).
- P8 wired runtime reservation into C0276 executor status and added coherent-lineage checkpoints. On reservation breach: no new heavy dispatch; freeze the latest coherent checkpoint if one exists, otherwise fail closed. Fallback does not bypass publication/final governance.
- P9 fault-injection tests passed fixture debounce/confirmation, late player state, runtime pressure, reservation breach, and async HTTP/timeout policy classes. Synthetic state tests were transactional/rolled back.
- P10 full deadline rehearsal passed all assertions: T-4 baseline, price optionality, fixture debounce then confirmation, player-state materiality, T-10 runtime pressure, T-3 reservation breach, and coherent fallback/fail-closed behavior.

## Important corrections / limitations
- A prior P5 note incorrectly said the live phase was CLOSED; the recorded live call at 17:20:58 UTC was T2_DELTA, about nine minutes before the 17:30 UTC deadline. This closeout supersedes that sentence.
- P4 does not yet implement semantic fixture materiality based on selected-path/xPts delta; it debounces raw fixture-signature churn conservatively.
- P7 node-level empirical samples currently use cron-level proxies for the main paths; the new sample table supports finer node instrumentation going forward.
- GW5 had no C0281-era coherent T-4 checkpoint, so retrospective T-3 behavior correctly fails closed rather than fabricating one.
- C0279 remains promotion-blocked and zero-effect. C0265 remains untouched.

## Governance preserved
Historical forecasts remain append-only. Missing remains unknown. ROLL comparison, structural gates, Noise-Control, Decision-Control, chip governance, C0248 selected-path authority and C0276 fail-closed authorization remain intact. Publication is not external execution. No transfer or chip execution was performed by C0281.

## Outcome
C0281 converts deadline handling from an optimistic T-2 recomputation pattern into an evidence-based convergence protocol: establish a coherent T-4 baseline, preserve information value, process material deltas, reserve time from empirical tail latency, and stop heavy work before the system can no longer finish safely.

C0281 is Completed / Verified.