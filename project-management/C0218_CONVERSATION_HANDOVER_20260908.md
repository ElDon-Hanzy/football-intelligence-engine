# C0218 Conversation Handover — 2026-09-08

Repository: `ElDon-Hanzy/football-intelligence-engine`
Supabase project: `knooiwezzsxcwhtjtdap`
FPL entry: `3559923` (`ElDon`)

## Non-negotiable operating rules

- Historical FPL and betting forecasts remain append-only.
- Missing data is not zero.
- No model family is promoted from one GW or one favorable statistic.
- Full-pool optimization must compare ROLL/no transfer and apply Noise-Control + Decision-Control.
- Current manager decisions remain separate from historical snapshots.
- Final GW4 lock still requires the scheduled T−2h press-conference / lineup / availability / price refresh.

## C0213 architecture consolidation

C0213 is Completed / Verified.

Key durable outcomes:

- canonical architecture and model-consumption registry are green;
- 14/14 production-effect components have definition-hash-bound behavioral proof;
- prediction-level effect provenance exists;
- tracker consumption governance is active;
- all 19 RETIRED external runtimes are physically deleted;
- active retired external count = 0;
- system consolidation = green.

## C0214 realized-role / evidence readiness repair

C0214 is Completed / Verified.

- GW3 realized-role starter mapping repaired to 220/220.
- `ingest-realized-player-roles` now consumes canonical FotMob identity mappings and mapping-aware append-only correction semantics.
- C0167 MUN–MCI explanation integrity repaired by exposing signed C0159 evidence already used by the final forecast; no probability was changed.
- GW4/GW5/GW6 projection readiness reconciled to 604/604 each.

## A0005 / C0215 decision

Frozen GW2 VALIDATION + GW3 TEST review completed.

Decision: **NO PROMOTION — ACCUMULATE MORE FORWARD EVIDENCE**.

`TACTICAL_QUALITY` had favorable average signs but the GW3 TEST edge was well inside normal sample/model noise. No retuning or production coefficient activation occurred.

## C0216 deferred research plan

Saved as `project-management/C0216_MANAGER_HIGH_STAKES_TACTICAL_REGIME_PLAN.md`.

Concept: Manager High-Stakes Tactical Regime (MHTR): model manager/context-specific tactical regime shifts in derbies, finals, knockout states, must-win/draw-is-enough situations, etc., then route those predicted regimes into FPL xMins/role and betting distribution/lambda consumers. Deferred by user; do not activate yet.

## C0217 storage / ingestion redesign

C0217 is Completed / Verified.

### Projection cadence

Old 4-hour full-snapshot behavior was replaced.

Current policy:

- current decision GW: at most one full daily snapshot;
- one forced final refresh beginning about T−2h before FPL deadline;
- next two GWs: one baseline each until they are promoted forward;
- cron is an eligibility check, not a write-every-run schedule.

### Odds ingestion

Only four market families are retained/normalized for now:

1. H2H / 1X2
2. Totals
3. Both Teams To Score
4. Correct Score

REST provider still returns broad payloads, so non-approved markets are discarded before DB writes. Filtered payload hashing skips consecutive identical market states. Redundant hourly bookmaker writer is disabled.

Historical cleanup removed non-approved normalized markets and stripped non-approved raw-market objects while preserving retained-market chronology.

Observed DB impact during C0217: approximately 571.3 MB → 517.2 MB after logical cleanup + physical reclamation.

### FPL manager state sync

Public Team ID sync was implemented for entry `3559923`.

FPL public API hides pre-deadline private current-team endpoints (`403`), so current GW4 state was established from:

- locked GW3 public squad/history;
- public transfer history;
- user explicit confirmation: **no transfers since GW3**.

Authoritative GW4 manager state:

- 15-player current squad proven;
- 3 free transfers;
- £0.0m ITB;
- acquisition squad cost £100.0m;
- current liquidation value refreshed to **£99.6m** after Tzolis £6.5→£6.4 and Isak £9.0→£9.1 (Isak selling value remains £9.0).

## C0197 / C0196 post-GW3 evaluation

### C0197

80/80 frozen pre-GW3 research snapshots evaluated without retuning.

V05 Tactical Clash A was the most interesting small-sample signal, but only one GW3 match reached 5+ goals and none reached 6+/7+. Decision remains monitor-only / no promotion.

### C0196

GW1–GW3 tail calibration no longer supports chasing the GW2 high-tail alarm:

- 4+ goals: 10 actual vs ~9.95 expected
- 5+: 5 vs ~5.30
- 6+: 2 vs ~2.46
- 7+: 2 vs ~1.02

No score-distribution change.

Headline correct-score selector still underperformed raw modal in GW3 (0/10 exact vs 2/10; direction 5/10 vs 8/10), but one GW is not enough for a production change.

## C0218 optimizer repair and current GW4 Manager Plan

C0218 remains **In Progress** by design until final T−2h refresh / deadline lock, but its implementation is Verified.

### Optimizer defects fixed

- PostgREST 1,000-row truncation fixed by loading each GW run separately (604×3 = 1,812 rows).
- FPL selling-value accounting fixed.
- Transfer pairs are position-safe.
- Transfer hit subtraction happens exactly once.
- Explicit scenario ladder compares 0FT / 1FT / 2FT / 3FT against ROLL.
- Runtime/contract version participates in optimizer input signature.
- v6 contract prevents serializing impossible MAX_4FT scenarios when only 3 FTs exist.

Latest optimizer contract: `C0218_FULL_POOL_SCENARIO_V03`.
Latest optimizer Edge runtime: v6.
Latest manager state: id 4.
Latest optimizer request: 3681.
Latest optimizer run: 5.

Scenario objectives are unchanged after the £99.6m price refresh:

- ROLL: 147.097
- 1FT: 150.517 (+3.421)
- 2FT: 154.254 (+7.157)
- 3FT: 158.459 (+11.363)

The raw 3FT optimizer solution is **not** the saved manager decision. It required Palmer → Schade plus Gabriel over Calafiori. Red-team rejected that third move because the edge is not robust once Chelsea–Hull captaincy/fixture context, Palmer penalty role, premium re-entry flexibility and model uncertainty are included.

### Current active GW4 Manager Plan

Active head: **Plan 10** (supersedes 9 → 8).
Status: `CURRENT_GW4_PLAN_PENDING_FINAL_T_MINUS_2H_REFRESH`.

Transfers:

1. **O'Reilly → Guéhi**
   - O'Reilly xMins 51.29 / start 63.25%; latest realized role holding midfielder; prior back issue.
   - Guéhi xMins 86.56 / start 95.55%; stable centre-back.
2. **Mosquera → Calafiori**
   - Mosquera xMins 40.01 / start 50.11%; missed GW3 matchday squad.
   - Calafiori xMins 70.93 / start 86.69%; 3/3 starts, stable wide-back role.

After transfers:

- 1 FT retained;
- projected bank £0.2m;
- Palmer retained;
- chip: NONE;
- captain: **João Pedro**;
- vice: **Bruno Fernandes**;
- risk: MEDIUM.

Current XI:

- Verbruggen
- Calafiori
- Guéhi
- N. Williams
- Bruno Fernandes
- Mbeumo
- Palmer
- Semenyo
- Tzolis
- João Pedro (C)
- Isak

Bench order:

1. Forster (GK)
2. Dalot
3. van Ewijk
4. Kusi-Asare

Captaincy note: raw GW4 xPts difference between Bruno (5.544) and João Pedro (5.347) is inside normal model error. Fixture/role context breaks the tie toward João Pedro at home to Hull; Bruno remains vice.

No chip is used in the current plan.

### CI / repo verification

- C0217 mirror commit: `78f69b5aec3538afd432cf11514ccba8c6eac239`.
- C0218 v6 latest code/migration commit: `d6edc890d554009520908d4cd34e375d0ce66dbc`.
- Workflow `34203106584` first attempt failed only from transient live Supabase endpoint timeouts/non-2xx responses on historical APIs.
- The failed workflow was rerun **unchanged**.
- Latest retry completed **SUCCESS**: typecheck, unit tests, build, bundle budget, all E2E/accessibility tests, artifact verification, Pages deployment, and live root + `/v2/` verification all passed.

## Tracker state at handover

- C0217: Completed / Verified.
- C0218: In Progress / Verified implementation; final T−2h refresh and deadline lock intentionally pending.
- tracker governance: green; zero bad change IDs / completed-not-verified / missing-ref violations / consumption violations.

## Immediate next conversation sequence

1. Read `PROJECT_STATE.md`, `DECISIONS_AND_HISTORY.md`, this handover, and the relevant C0217/C0218 migration/docs.
2. Independently inspect GitHub main and Supabase production; do not blindly trust this handover.
3. Query `public.change_tracker_working` and run `private.audit_change_tracker_governance_v01()`.
4. Confirm C0218 active plan head is still Plan 10 unless superseded by a newer append-only plan.
5. Do **not** execute transfers early merely because a current plan exists.
6. At approximately T−2h before the GW4 deadline, refresh injuries, press conferences, predicted lineups, prices/ownership, tactical roles, GW4–GW6 projections, manager liquidation/bank/FT state and rerun the full-pool optimizer + captaincy + Noise-Control.
7. If the robust decision survives, save the deadline-lock plan as a new append-only manager-plan row superseding Plan 10.
8. Continue remaining approved research/technical-debt work only after the GW4 deadline decision path is safe.
