# Football Intelligence Engine — Project State

_Last updated: 2026-09-08 (Dubai) — through C0219 cadence reconciliation_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research.

Permanent rules:

- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Completed-match evidence may update future decisions only.
- Retrospective replay/shadow work is stored separately and never presented as a genuine historical prediction.
- Missing data is not zero.
- Preserve provenance plus `known_at` / `captured_at` / `evidence_cutoff` timestamps.
- Never commit secrets/API keys.
- Unvalidated intelligence remains research/shadow until its registered forward gate passes.
- Distinguish Planned / Coded / Committed / Deployed / Executed / Verified.
- Do not tune on an outcome and then call a same-sample rerun independent validation.
- Negative experiments are first-class evidence.
- Projection readiness is not decision readiness.
- Every meaningful FPL action must compare against ROLL and pass Noise-Control / Decision-Control.

Canonical references:

- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `DECISIONS_AND_HISTORY.md`
- `project-management/C0218_CONVERSATION_HANDOVER_20260908.md`
- `project-management/C0219_PROJECTION_CADENCE_OPTIMIZER_RECONCILIATION_20260908.md`

## 2. Production source of truth

Supabase project: `knooiwezzsxcwhtjtdap`.
GitHub: `ElDon-Hanzy/football-intelligence-engine`.
Working engineering ledger: `public.change_tracker_working`.

For every resumed engineering session:

1. read this file and `DECISIONS_AND_HISTORY.md`;
2. read the latest relevant handover/change docs;
3. query `public.change_tracker_working`;
4. run `private.audit_change_tracker_governance_v01()`;
5. inspect relevant architecture/readiness/forward-cohort status functions;
6. independently verify current Supabase/GitHub state before material changes.

Live runtime/registry evidence outranks stale documentation.

## 3. C0213 architecture consolidation

C0213 is **Completed / Verified**.

Current permanent architecture controls include:

- canonical production and research pathways;
- machine-readable component/dependency/capability registry;
- 14/14 production-effect components with definition-hash-bound behavioral proof;
- prediction-level effect provenance;
- tracker consumption/evaluator governance;
- zero duplicate active cron targets;
- zero active RETIRED external deployments;
- all 19 previously active RETIRED external runtimes physically deleted;
- system consolidation green.

The active production FPL path remains:

`RESULTS → CURRENT DATA → REALIZED ROLES → PLAYER/TEAM STATE → TACTICAL/FIXTURE STATE → C0159 → C0166 → PLAYER PROJECTION → DISTRIBUTION → FULL-POOL OPTIMIZER → DECISION READINESS → SAVED MANAGER PLAN → API/UI`

## 4. C0214 realized-role / evidence repair

C0214 is **Completed / Verified**.

- GW3 realized-role starter mapping repaired to **220/220**.
- Realized-role ingestion now uses canonical FotMob identity mappings with append-only mapping-aware correction semantics.
- MUN–MCI C0167 explanation integrity repaired using signed C0159 evidence already embedded in the final forecast; no probability was changed.
- GW4/GW5/GW6 projection horizon reconciled to **604/604 each**.

## 5. A0005 / C0215

Frozen GW2 VALIDATION + GW3 TEST review is complete.

Decision: **NO PROMOTION — ACCUMULATE MORE FORWARD EVIDENCE**.

`TACTICAL_QUALITY` had favorable signs but the TEST edge was inside normal model/sample noise. No rescue retuning or production activation occurred.

W0002 remains independently frozen for GW4 VALIDATION / GW5 TEST.

## 6. C0216 deferred MHTR research

The Manager High-Stakes Tactical Regime plan is saved at:

`project-management/C0216_MANAGER_HIGH_STAKES_TACTICAL_REGIME_PLAN.md`

It models manager/context tactical-regime changes in derbies, finals, knockouts, must-win/draw-is-enough states and similar high-stakes conditions, with separate downstream FPL and betting consumers.

User explicitly deferred development. Do not activate yet.

## 7. C0217 storage / ingestion redesign

C0217 is **Completed / Verified**.

### Projection cadence

- current decision GW: at most one full daily projection snapshot;
- one final forced refresh beginning about T−2h before the FPL deadline;
- next two GWs: one baseline each until promoted forward;
- cron is an eligibility check, not a full-write cadence.

### Odds scope

Only these four market families are stored/normalized for now:

1. H2H / 1X2
2. Totals
3. Both Teams To Score
4. Correct Score

Non-approved markets are discarded before DB write. Filtered payload hashing skips consecutive identical market states. The redundant hourly odds writer is disabled.

Historical non-approved normalized markets and raw market objects were removed while retaining the four approved market chronologies.

Observed DB size during C0217 fell from approximately **571.3 MB → 517.2 MB** after logical cleanup and physical reclamation.

## 8. FPL manager state — entry 3559923

Public FPL Team ID: `3559923` (`ElDon`).

FPL public API exposes locked history but hides current pre-deadline private team endpoints (`403`). Current GW4 state is therefore based on public GW3 history plus the user's explicit confirmation: **no transfers since GW3**.

Current authoritative GW4 manager state:

- squad: 15/15 proven and unchanged from GW3;
- free transfers: **3**;
- ITB: **£0.0m**;
- acquisition squad cost: **£100.0m**;
- current liquidation value: **£99.6m** after Tzolis £6.5→£6.4 and Isak £9.0→£9.1 (Isak selling value remains £9.0).

Manager state id: **4**.

## 9. C0218 optimizer repair

C0218 remains **In Progress** only because the final T−2h refresh / deadline lock is intentionally pending. Its current implementation is **Verified**.

Fixed defects:

- PostgREST row-limit truncation: load the three GW projection runs separately (1,812 rows total).
- FPL selling-value accounting.
- position-safe transfer pairs.
- transfer hit subtraction exactly once.
- explicit 0FT / 1FT / 2FT / 3FT scenario ladder against ROLL.
- optimizer runtime/contract version participates in input signature.
- impossible MAX_4FT serialization removed when only 3 FTs exist.

Latest optimizer runtime: **v6**.
Latest contract: `C0218_FULL_POOL_SCENARIO_V03`.
Latest optimizer request: **3681**.
Latest optimizer run: **5**.

Current scenario objectives after the £99.6m price refresh:

- ROLL: **147.097**
- 1FT: **150.517** (+3.421)
- 2FT: **154.254** (+7.157)
- 3FT: **158.459** (+11.363)

The raw 3FT optimum is not automatically authoritative. Its third move requires Palmer → Schade plus Gabriel over Calafiori and was rejected by red-team because the incremental edge is not robust to Chelsea–Hull fixture/captaincy context, Palmer's penalty role, premium re-entry flexibility and model uncertainty.

## 10. C0219 projection-cadence / optimizer reconciliation

C0219 is a **Critical production reliability repair** discovered during the post-C0218 preflight.

Production evidence showed two immutable projection runs had been created on 2026-09-08 for each of GW4/GW5/GW6 even though C0217 intended bounded cadence. C0217's own cadence function was correct; the older C0213 optimizer orchestrator was independently marking projections stale whenever frequently refreshed C0166/player-state timestamps became newer, then directly invoking the raw snapshot generator.

C0219 reconciles the contracts:

- **C0217 is now the sole projection-cadence controller**;
- the C0213 optimizer orchestrator no longer directly calls the raw FPL snapshot generator;
- upstream completeness remains fail-closed;
- optimizer readiness accepts a complete frozen snapshot that is valid under the C0217 cadence;
- current-GW cadence is one snapshot per 24h plus a final T−2h window snapshot;
- GW+1/GW+2 complete frozen baselines remain valid until promoted;
- newer live upstream state is surfaced as `upstream_drifted_since_snapshot` rather than silently forcing storage writes.

Verification used runs **1334 / 1335 / 1336**, preserved optimizer input signature `ebd72d6b64c38db63c9a0238c415ffc8`, and reused optimizer run **5**. Projection counts were **2/2/2 before and after** the verification orchestration, so no third duplicate was created. Existing accidental duplicates remain immutable evidence and were not deleted or rewritten.

Migration: `20260908090429_c0219_projection_cadence_optimizer_reconciliation_v01`.

No manager decision changed from C0219.

## 11. Current GW4 Manager Plan

Current active append-only head: **Plan 10**, superseding 9 → 8.

Status: `CURRENT_GW4_PLAN_PENDING_FINAL_T_MINUS_2H_REFRESH`.

### Transfers

1. **O'Reilly → Guéhi**
2. **Mosquera → Calafiori**

After the moves:

- retain Palmer;
- keep **1 FT**;
- projected bank **£0.2m**;
- chip: **NONE**;
- captain: **João Pedro**;
- vice-captain: **Bruno Fernandes**;
- risk: **MEDIUM**.

### Current XI

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

Captaincy note: Bruno's raw GW4 model xPts (5.544) vs João Pedro (5.347) is inside normal model error. Fixture/role context currently breaks the tie toward João Pedro at home to Hull; Bruno remains vice.

Do not execute this plan as final lock before the scheduled T−2h refresh.

## 12. C0197 / C0196 post-GW3 research

### C0197

80/80 frozen pre-GW3 experiment snapshots were evaluated without retuning. V05 Tactical Clash A was the most interesting small-sample signal, but evidence remains far too sparse for promotion. Monitor only.

### C0196

GW1–GW3 tail calibration currently shows no robust reason to alter the score distribution:

- 4+ goals: 10 actual vs ~9.95 expected
- 5+: 5 vs ~5.30
- 6+: 2 vs ~2.46
- 7+: 2 vs ~1.02

Headline score selection remains under monitoring after underperforming raw modal in GW3, but no production selector change is justified from one GW.

## 13. CI / repository state

Relevant recent commits:

- C0217 durability mirror: `78f69b5aec3538afd432cf11514ccba8c6eac239`
- C0218 v6 optimizer/migration mirror: `d6edc890d554009520908d4cd34e375d0ce66dbc`
- C0218 conversation handover: `10c4bad3125283234102d9fa509ced83e78bb298`
- C0219 migration mirror: `d072c3c6681d494b4eb5f0ddf7502292b8ac3ce8`
- C0219 reasoning note: `a62fc79f20417de55549e0b0e6351e68b015a263`

Workflow `34203106584` first attempt failed only from transient live Supabase endpoint timeouts/non-2xx responses on historical APIs. It was rerun **unchanged** and attempt 3 completed **SUCCESS**:

- typecheck green;
- unit tests green;
- build green;
- bundle budget green;
- all E2E/accessibility tests green;
- artifact verification green;
- Pages deployment green;
- live legacy root + `/v2/` verification green.

C0219 source-mirror CI must be checked independently before C0219 is marked Completed.

## 14. Tracker / governance

- C0217: **Completed / Verified**.
- C0218: **In Progress / Verified implementation**, final T−2h decision refresh pending.
- C0219: **In Progress / Verified production implementation**, repository/CI closeout pending.
- global tracker governance must remain green after C0219 registration/closeout.

## 15. Immediate sequence

1. Finish C0219 repository/CI/governance closeout without altering Plan 10.
2. Do not make additional GW4 moves before the final refresh simply because Plan 10 exists.
3. At approximately **14:30 Dubai time on 2026-09-12** (T−2h for the 16:30 Dubai GW4 deadline), refresh current injuries, press conferences, predicted XIs, roles/xMins, prices/ownership, GW4–GW6 projections, manager liquidation value/bank/FT state.
4. Rerun the full-pool optimizer and separate captaincy model.
5. Apply Noise-Control and Decision-Control against ROLL and Plan 10.
6. If the robust decision survives, save a new append-only deadline-lock plan superseding Plan 10.
7. Continue deferred research / security-performance debt afterward according to tracker priority.

This file is the operational state summary; detailed reasoning and change history remain in the tracker, migration history, canonical architecture documents, and project-management notes.
