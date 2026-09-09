# Football Intelligence Engine — Conversation Handover after C0236

Date: 2026-09-09 (Dubai)
Repository: `ElDon-Hanzy/football-intelligence-engine`
Supabase: `knooiwezzsxcwhtjtdap`
FPL Team ID: `3559923`

## 1. Handover purpose

This file is the operational bridge into the next conversation after the C0220–C0236 forecast-integrity, autonomy, PRE-FINAL cadence and chronology-safe serving work.

The next conversation must **not** trust this handover blindly. First read the canonical files, then independently inspect current GitHub + Supabase state and compare them with this document.

Read first:

1. `PROJECT_STATE.md`
2. `DECISIONS_AND_HISTORY.md`
3. `project-management/C0226_AUTONOMOUS_FPL_DECISION_ARCHITECTURE_PLAN_20260909.md`
4. `project-management/C0226_AUTONOMOUS_FPL_DECISION_ARCHITECTURE_CLOSEOUT_20260909.md`
5. `project-management/C0236_CHRONOLOGY_SAFE_HISTORY_SERVING_CLOSEOUT_20260909.md`
6. this handover file

Then query `public.change_tracker_working`, run `private.audit_change_tracker_governance_v01()`, `private.c0213_tracker_consumption_governance_v01()`, and `private.run_c0213_behavioral_consumption_tests_v01()`.

Live runtime/registry evidence outranks documentation if anything disagrees.

---

## 2. Non-negotiable operating rules

- Objective: maximize probability of FPL Overall Rank #1, not historical points or template conformity.
- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Missing data is not zero.
- Fixture/model intelligence freezes at kickoff.
- Unvalidated research stays SHADOW/diagnostic until its forward gate passes.
- Every meaningful FPL action compares against ROLL/no-action.
- Model uncertainty, tactical role, expected minutes, club-slot cost, flexibility and future transfer burden are first-class decision inputs.
- Statistically indistinguishable options must be labelled `NO_MEANINGFUL_EDGE` / equivalent; do not rank decimal noise as if it were real.
- Ownership/EO has **zero direct xPts effect**. It may affect downstream rank utility only inside the model-error/equivalence band.
- The autonomous final gate is allowed to refuse action.
- No external FPL transfers/chips are executed automatically.
- Do not activate C0197/C0202/A0005/W0002/C0210/C0211/C0216/C0224/C0230 numeric effects merely because the models exist.

---

## 3. Current production architecture

Canonical path:

`RESULTS → CURRENT DATA → REALIZED ROLES → PLAYER/TEAM STATE → TACTICAL/FIXTURE STATE → C0159 → C0166 → PLAYER PROJECTION → DISTRIBUTION → FULL-POOL OPTIMIZER → STRUCTURAL ENSEMBLE → UNCERTAINTY/ROBUSTNESS → RANK-AWARE DECISION CONTROL → RED-TEAM → AUTONOMOUS FINAL GATE → SAVED MANAGER PLAN → API/UI`

Recent production milestones:

- C0213 architecture consolidation: Completed / Verified.
- C0217 projection cadence/storage redesign: Completed / Verified.
- C0219 cadence/optimizer reconciliation: **now reconciled to Completed / Verified** in tracker on 2026-09-09; C0217 is the sole projection-write cadence controller.
- C0220 forecast-integrity repair: penalties, realized-role numeric adaptation, team xMins/start competition budgets.
- C0221/C0223 symmetric xMins + exact-horizon role/availability + role-aware optimizer control.
- C0224 Parity–Draw Regime: SHADOW/forward-monitor only.
- C0225 rank-aware Differential Opportunity/Leverage: production Decision-Control, zero direct xPts effect.
- C0226–C0234 autonomous FPL decision architecture: Completed / Verified.
- C0235 PRE-FINAL daily production cadence: Completed / Verified.
- C0236 chronology-safe historical UI/Markets serving: Completed / Verified.

Latest verified global governance after C0236:

- tracker rows: 161
- bad Change IDs: 0
- Completed-not-Verified: 0
- Completed-without-refs: 0
- decision rows without refs: 0
- consumption-contract violations: 0
- rows requiring contracts: 79
- covered contracts: 79/79
- production behavioral proof: 14/14 PASS

---

## 4. Current projection horizon / PRE-FINAL state

Current verified horizon:

- GW4: **run 1354 — PRE_FINAL**
- GW5: run 1348
- GW6: run 1350
- GW7: run 1352
- GW8: run 1353

Each current horizon run has 604 player forecasts and preserves team constraints of max 11 starters / 990 minutes.

Current PRE-FINAL pointer:

- `public.current_fpl_prefinal_snapshot_v01`
- pointer row id: 1
- gameweek: 4
- prediction run: **1354**
- generated: `2026-09-08T23:31:25.431934+00:00`
- deadline: `2026-09-12T12:30:00+00:00`
- immutable/frozen: true
- history is append-only; the pointer advances to newer daily PRE-FINAL runs, forecasts are never overwritten.

C0217/C0235 rule:

- before T−2h: at most one fresh current-GW PRE_FINAL every 24h;
- at T−2h: separate FINAL generation + full autonomous gate;
- optimizer/orchestrator may not bypass cadence by writing raw projection runs directly.

GW4 Dubai timing:

- first kickoff: **2026-09-12 18:00 Dubai**
- FPL deadline: **16:30 Dubai**
- T−2h final refresh: **14:30 Dubai**

There is an existing automation `GW4 Final Autonomy Gate` scheduled for 2026-09-12 14:30 Asia/Dubai.

---

## 5. Current manager state

Latest authoritative manager state snapshot before handover:

- snapshot id: 4
- GW: 4
- captured: `2026-09-08 07:58:57+00`
- free transfers: **3**
- bank: **£0.0m**
- acquisition squad cost: **£100.0m**
- liquidation value: **£99.6m**
- user confirmation: no transfers since GW3

Current 15:

GK: Verbruggen, Forster

DEF: O'Reilly, Mosquera, Dalot, N. Williams, van Ewijk

MID: Bruno Fernandes, Mbeumo, Palmer, Semenyo, Tzolis

FWD: João Pedro, Isak, Kusi-Asare

Do not assume this state remains current near deadline; refresh public FPL manager data, prices, selling values, FTs and chip usage before a final decision.

---

## 6. Saved manager plan is provisional only

Latest saved head: **Plan 10**.

Status: `CURRENT_GW4_PLAN_PENDING_FINAL_T_MINUS_2H_REFRESH`

Plan 10 encoded:

- O'Reilly → Guéhi
- Mosquera → Calafiori
- retain Palmer
- captain João Pedro
- vice Bruno
- chip NONE

Plan 10 is **not authorized for execution** by the autonomous gate. Do not use it merely because it is the latest saved plan.

C0218 remains In Progress / Verified specifically because the final GW4 lock is still pending T−2h.

---

## 7. Latest autonomous gate result

Latest production autonomous gate: `public.fpl_autonomous_gate_runs.id = 2`.

Captured: `2026-09-09 11:54:15+00`

Inputs include PRE-FINAL run 1354 and a 5-GW structural ensemble.

Result:

- final status: **`DECISION_NOT_READY`**
- action: **NONE**
- authorized: false
- passed gates: 7/13

Blocking gates:

1. `UNCERTAINTY_SENSITIVITY` → `EDGE_NOT_ROBUST`
2. `EQUIVALENCE_ADJUDICATION` → `RAW_OPTIMUM_STRUCTURALLY_CHALLENGED`
3. `STRUCTURAL_ROBUSTNESS` → challenger family `DUAL_PREMIUM_MID_VALUE`
4. `ADVERSARIAL_RED_TEAM` → raw winner flips under small role-risk sensitivity
5. `FINAL_T_MINUS_2H_REFRESH` → window not open
6. `CHIP_OPPORTUNITY_COST` → season-level Wildcard opportunity model not ready

Latest objective context from gate run 2:

- ROLL: **206.979**
- best normal no-chip 3FT: **230.387**
- raw fresh/Wildcard benchmark: **246.002**
- raw fresh edge vs best no-chip: **+15.615**
- raw best structural family: `BALANCED_VALUE`
- structural challenger: `DUAL_PREMIUM_MID_VALUE`
- ensemble classification: `MULTI_FAMILY_EQUIVALENCE`
- red-team status: `EDGE_NOT_ROBUST`

Latest raw best no-chip 3FT fallback reference:

- O'Reilly → Guéhi
- Mosquera → Gabriel
- Palmer → Szoboszlai

**This fallback is not authorized.** It is optimizer evidence only.

Wildcard history is live-verified as available/unused, but Wildcard remains blocked as a final recommendation because the first-half opportunity cost through GW19 cannot yet be quantified credibly from only GW4–GW8 numerical projections.

---

## 8. Critical decision-learning from this conversation

The user correctly challenged the old optimizer for producing one decimal winner when several squad structures were practically equivalent.

Permanent acceptance example:

- old Structure D objective: ~240.952
- revised structurally cleaner D: ~240.841
- difference ~0.11 weighted points

The engine must treat this as **equivalent / no meaningful edge**, not claim the first is superior.

The revised structural direction that exposed the problem included ideas such as:

- keep Bruno rather than sacrifice him purely for £/xPts efficiency;
- prefer João Pedro to Thiago when projected means are virtually identical but João Pedro has the cleaner uncertainty/team-environment profile;
- challenge £8.0m Gabriel on marginal value and Arsenal slot opportunity cost;
- recognize De Cuyper's actual wide-attacking role;
- explicitly surface Rogers, Isak, Gakpo, Cherki, Semenyo and other viable alternatives rather than letting one heuristic seed hide them;
- seek at least one **legitimate** explosive low-owned opportunity, but never force a differential solely because of low ownership.

Do **not** hard-code these player names as optimizer rules. They are regression/acceptance examples showing what the autonomous layers must be able to discover on their own.

---

## 9. Ownership / leverage semantics

Permanent rule:

**Ownership/EO = 0 direct FPL xPts.**

It changes outcome/rank utility, not football scoring expectation.

At this early-season stage, leverage may break ties inside the model-error band but may not rescue a clearly inferior projected option.

C0225 requires a low-owned player to first pass football gates such as:

- expected minutes / start probability
- attacking/tactical role safety
- P10+/P15+ ceiling
- reasonable mean xPts

Example: Schade qualified as a real explosive differential because the football case was already strong; low ownership was not itself the reason to select him.

Later-season variance can adapt to OR, remaining GWs and gap to #1, but still in downstream OR utility rather than xPts.

---

## 10. C0224 Parity–Draw shadow result

The user reopened the hypothesis that fixtures with no clear directional edge may draw more often than the model implies.

Shadow finding:

2025/26 broad parity ≤10pp home/away probability gap:

- 70 matches
- market-implied draw ~28.2%
- actual draw ~31.4%
- +3.2pp residual

Parity ≤10pp + non-high-scoring:

- 63 matches
- expected ~28.5%
- actual ~33.3%
- +4.8pp

Strongest predefined slight-lean 5–10pp band:

- 38 matches
- expected ~28.2%
- actual ~36.8%
- +8.6pp

Genuine GW1–3 frozen forward cohort, parity ≤10pp:

- 9 matches
- engine pDraw ~24.5%
- actual 4/9 = 44.4%

Evidence is suggestive but sample is too small.

C0224 remains SHADOW with zero production effect. Promotion requires ≥60 genuine forward parity fixtures, positive residual in two independent forward blocks, and actual calibration/log-loss improvement.

---

## 11. C0236 website / serving state

C0236 is **Completed / Verified**.

Historical FPL:

- GW1: `HISTORICAL_FROZEN` but surviving forecast is not valid pre-deadline model truth → fail closed.
- GW2: valid historical frozen forecast.
- GW3: valid historical frozen forecast.
- GW4: PRE_FINAL, 604 players.
- current prices/ownership/news are not backfilled into old GWs.

Historical Fixtures:

- only genuinely pre-kickoff evidence is served;
- audit found zero served post-kickoff tactical/role rows across GW1–GW4;
- early missing evidence is shown as unavailable/partial, not reconstructed.

Markets:

- correct-score serving now uses `public.correct_score_price_summary_cache` and the cache-backed serving view;
- GW1–GW4 betting API returns 10 fixtures per GW with zero verified timeout warnings after repair.

Engine diagnostics browser auth was repaired after strict CI exposed an invalid public anon credential path.

Final successful documentation/deployment workflow:

- GitHub Actions **34343548927**
- head `dded5e8407bbd083dfb1f5934395edd277f0d4c1`
- typecheck/unit/build/bundle/E2E/accessibility/Pages/live root + `/v2/` all green.

Closeout: `project-management/C0236_CHRONOLOGY_SAFE_HISTORY_SERVING_CLOSEOUT_20260909.md`.

---

## 12. Important model-consumption facts

- Aggregate tactical matchup is already production through C0147 evidence → C0159 bounded adjustment → C0166 fixture evidence → team lambdas → player projections.
- Raw C0147 remains SHADOW; only bounded derivatives are production.
- Generic C0202 player-side/flank xPts scalar remains unpromoted after holdout failure.
- Realized player role is production factual state and now reaches both projection and optimizer Decision-Control.
- Exact target-GW role/availability state exists through GW8; GW6+ may not silently fall back to GW5.
- Penalties are explicit; non-penalty set-piece hierarchy remains less fully modeled and is a future candidate, not permission for ad-hoc changes.
- C0140 physical load/congestion remains diagnostic/research, not a production coefficient.
- Bookmaker market disagreement is not currently a direct FPL xPts input.
- C0227 uncertainty is explicit stress-test metadata, not fabricated confidence intervals.

---

## 13. Open / deferred work not to confuse with immediate GW4 decisioning

Key tracker items still open/in-progress/monitoring include:

- C0218 — final GW4 optimizer/manager-plan lock pending T−2h
- C0196 — historical score-call fallback / selector audit
- C0197 — high-score research families
- C0202 — flank/player-side matchup research
- C0205/C0206 — transfer ledger / new-player monitoring
- C0207–C0211 — transfer/regime/set-piece/uncertainty extensions, mostly deferred
- C0216 — MHTR deferred
- C0176 — controlled UI v2 cutover / legacy rollback decision
- C0034 — third Correct Score source blocked
- C0082 — genuine spatial/tracking evidence blocked

Do not start new model-family development before the GW4 final decision unless it is a production reliability, data-integrity, or already-approved evaluator requirement.

---

## 14. Immediate next sequence for the new conversation

1. Read the six handover/canonical docs listed at the top.
2. Independently inspect GitHub + Supabase current state.
3. Query `public.change_tracker_working` and rerun governance + 14/14 behavioral proof.
4. Check whether a newer daily PRE_FINAL than run 1354 has been generated under C0217/C0235; if due and cadence permits, run the normal daily cycle, not a forced duplicate.
5. Do **not** make/save/execute a new FPL final plan merely because Plan 10 or a raw optimizer fallback exists.
6. Continue monitoring GW4 current information until T−2h: prices/ownership, manager state/FT/sell values/chips, injuries/suspensions, press conferences, predicted XIs, expected minutes, transfers, penalties/set pieces, European/cup congestion, tactical changes and matchup evidence.
7. At the final window (2026-09-12 14:30 Dubai), generate the separate final current-GW production snapshot.
8. Rerun canonical full-pool optimizer and C0227→C0234 stack.
9. Compare ROLL, best normal-transfer path and Wildcard/fresh-squad option.
10. Wildcard can be authorized only if chip availability, structural robustness, red-team and opportunity-cost gates all pass. A large raw fresh-squad objective gap alone is insufficient.
11. If C0234 returns `FINAL_AUTONOMOUS_DECISION`, save a new append-only GW4 manager plan superseding Plan 10; still do not execute external FPL transfers automatically.
12. If C0234 returns `DECISION_NOT_READY` or `NO_MEANINGFUL_EDGE`, do not force action.

---

## 15. Useful production checks

```sql
select * from public.current_fpl_prefinal_snapshot_v01;
select * from public.fpl_autonomous_gate_runs order by id desc limit 5;
select * from public.fpl_manager_state_snapshots order by id desc limit 5;
select * from public.fpl_manager_plans order by id desc limit 5;
select private.audit_change_tracker_governance_v01();
select private.c0213_tracker_consumption_governance_v01();
select private.run_c0213_behavioral_consumption_tests_v01();
```

Use exact live function definitions and current schemas rather than guessing column names.

---

## 16. User interaction / execution discipline

- The user expects the engine to discover structural issues autonomously, not rely on a final human sanity check.
- When a long tool sequence is running, give short factual progress checkpoints instead of appearing stuck.
- If a simple SQL/tool error occurs, fix it immediately rather than leaving it unresolved.
- Challenge the user's football assumption when evidence points elsewhere, but do not defend a model output merely because it came from the engine.
- Distinguish confirmed information, estimates and rumors.
- Current action remains **NONE** until the autonomous decision gate authorizes otherwise.
