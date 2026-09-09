# Football Intelligence Engine — Project State

_Last updated: 2026-09-09 (Dubai) — through C0237 always-live FPL publication and C0238 Pages reliability closeout_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research, with one FPL objective: maximize the probability of finishing #1 Overall.

Permanent rules:

- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Completed-match evidence may update future decisions only.
- Retrospective replay/shadow work is stored separately and never presented as genuine historical prediction truth.
- Missing data is not zero.
- Preserve provenance plus `known_at` / `captured_at` / `evidence_cutoff` chronology.
- Never commit secrets/service-role credentials.
- Unvalidated intelligence remains research/shadow until its registered forward gate passes.
- Distinguish Planned / Coded / Committed / Deployed / Executed / Verified.
- Projection readiness is not decision readiness.
- Every meaningful FPL action compares against ROLL and passes Noise-Control / Decision-Control.
- Ownership/EO has zero direct xPts effect; it is downstream rank/leverage evidence only inside statistical equivalence.
- A negative model/layer verdict may challenge a decision; it must not be hidden.
- A final autonomous decision gate may refuse final authorization.
- **The active Gameweek must still publish its best current fully evaluated plan whenever every required layer has run.** “Not final” is not the same as “no plan.”

Canonical references:

- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `project-management/C0226_AUTONOMOUS_FPL_DECISION_ARCHITECTURE_PLAN_20260909.md`
- `project-management/C0226_AUTONOMOUS_FPL_DECISION_ARCHITECTURE_CLOSEOUT_20260909.md`
- `project-management/C0236_CHRONOLOGY_SAFE_HISTORY_SERVING_CLOSEOUT_20260909.md`
- `project-management/C0237_ALWAYS_LIVE_FPL_PLAN_PUBLICATION_CLOSEOUT_20260909.md`

## 2. Production source of truth

Supabase project: `knooiwezzsxcwhtjtdap`
GitHub: `ElDon-Hanzy/football-intelligence-engine`
FPL Team ID: `3559923`
Engineering ledger: `public.change_tracker_working`

For every resumed engineering session:

1. read this file and `DECISIONS_AND_HISTORY.md`;
2. read the latest relevant handover/change docs;
3. query `public.change_tracker_working`;
4. run `private.audit_change_tracker_governance_v01()`;
5. run C0213 consumption/behavioral governance where FPL production is involved;
6. inspect live runtime/database/registry state independently.

Live runtime/registry/database evidence outranks documentation if they disagree.

## 3. Canonical FPL production path

C0213 architecture consolidation remains Completed / Verified.

Current decision path:

`RESULTS → CURRENT DATA → REALIZED ROLES → PLAYER/TEAM STATE → TACTICAL/FIXTURE STATE → C0159 → C0166 → PLAYER PROJECTION → EVENT DISTRIBUTION → FULL-POOL OPTIMIZER → C0227 UNCERTAINTY → C0228 STRUCTURAL ENSEMBLE/EQUIVALENCE → C0229 STRUCTURAL ROBUSTNESS → C0230 SHADOW TEAM REGIME → C0231 FORWARD MANAGEMENT/PREMIUM ACCESS → C0232 OR/RANK LEVERAGE → C0233 RED-TEAM → C0234 FINAL AUTHORIZATION GATE → C0237 LIVE PUBLICATION → FINAL/EXECUTION LEDGER WHEN AUTHORIZED → API/UI`

Latest verified production-effect behavioral proof: **14/14 PASS on GW4 run 1354**.

## 4. Current projection cadence / horizon

C0217 is the sole projection-cadence controller. C0235 adds named immutable PRE_FINAL publication snapshots.

Current verified horizon:

- GW4: run **1354 — PRE_FINAL**
- GW5: run 1348
- GW6: run 1350
- GW7: run 1352
- GW8: run 1353

Each run carries 604 player projections. Current-GW generation is at most once per 24h under canonical cadence, plus a separate forced final refresh at T−2h. Forward numerical precision must not be invented beyond approved data.

GW4 schedule:

- first kickoff: 2026-09-12 18:00 Dubai
- deadline: 16:30 Dubai
- final T−2h refresh: **14:30 Dubai**

## 5. Current manager state

Latest manager state snapshot:

- id 4
- 3 free transfers
- £0.0m ITB
- £99.6m liquidation value

Standing user confirmation: no transfers since GW3 unless later recorded in authoritative manager state.

The older `public.fpl_manager_plans` Plan 10 is a provisional historical/execution-ledger row. It is **not** the primary current-GW decision truth after C0237 and must not be executed simply because it exists.

## 6. C0226–C0234 autonomous decision architecture

C0226 and C0227–C0234 are Completed / Verified.

Core semantics:

- C0227 tracks explicit uncertainty/sensitivity rather than false precision.
- C0228 searches materially different structural families and preserves equivalence classes.
- C0229 evaluates marginal value, role/minutes risk, club-slot cost, premium access and flexibility.
- C0230 is shadow/diagnostic only; zero numeric production effect.
- C0231 evaluates future transfer burden and premium reacquisition/access.
- C0232 applies rank/leverage only downstream; it does not rewrite xPts.
- C0233 automatically red-teams the preferred structure.
- C0234 is final authorization and may return `FINAL_AUTONOMOUS_DECISION`, `DECISION_NOT_READY`, or `NO_MEANINGFUL_EDGE`.

Permanent regression case: near-equal decimal structures such as `240.952 vs 240.841` are statistically equivalent; uncertainty, role, marginal £, club slots, premium access, flexibility and red-team evidence must adjudicate them.

ROLL/no action remains mandatory in every comparison.

## 7. C0237 — Always-Live FPL Plan Publication

C0237 is the active serving contract for the current Gameweek.

Primary Supabase objects:

- `public.fpl_live_plan_publications`
- `public.current_fpl_live_plan_v01`
- `private.c0237_publish_current_fpl_plan_v01(integer, integer)`

Permanent invariant:

`ALL_REQUIRED_LAYERS_EVALUATED_NEGATIVE_RESULTS_ALLOWED_SKIPPED_LAYERS_FORBIDDEN`

Stage and authorization status are separate dimensions:

- stage: `PRE_FINAL` or `FINAL`;
- status: `PROVISIONAL`, `CONTESTED`, or `FINAL`.

A negative required layer may make the publication CONTESTED; it does not make the current plan disappear. A skipped mandatory layer blocks publication.

Only a C0234-authorized final publication may set `execution_authorized=true`.

`public.fpl_manager_plans` remains the separate final/execution ledger.

## 8. Shadow / research publication semantics

C0237 exposes shadow/research evidence publicly without promoting it numerically:

- `research_only=true`
- `numeric_production_effect=false`

This includes C0230 team-regime evidence and registered research/shadow families. C0224 Parity–Draw and other unpromoted research remain shadow-only unless separately validated/promoted.

No mandatory differential quota exists. Ownership/EO remains zero direct xPts effect.

## 9. Current GW4 live publication

Current verified C0237 publication:

- Gameweek 4
- stage `PRE_FINAL`
- status `CONTESTED`
- prediction run 1354
- manager state 4
- execution authorized `false`
- every required decision/shadow layer evaluated
- research-only evidence enabled with zero numeric production effect

Current best fully evaluated normal-transfer plan:

- O'Reilly → Guéhi
- Mosquera → Gabriel
- Semenyo → Schade

Current XI:

- Verbruggen
- Gabriel, Guéhi, N. Williams
- Bruno Fernandes, Mbeumo, Schade, Tzolis, Palmer
- João Pedro, Isak

Bench:

- Forster
- Dalot
- van Ewijk
- Kusi-Asare

Captain: **Gabriel**
Vice: **Bruno Fernandes**
Chip: NONE

This is the plan the engine would currently choose if the deadline were now. It is explicitly **not final authorization** because the red-team/final-information gates are not yet fully green.

## 10. API / UI serving

`fpl-manager-plan-api` production version: **v6 ACTIVE**, JWT verification retained.

Current API semantics:

- `plan` = best current C0237 publication when available;
- `live_plan` = publication + blockers + lineage + research evidence;
- `saved_plan` = separate final/execution ledger;
- `research_only` = public shadow/research evidence.

The FPL UI labels current state explicitly as `Best current plan · PROVISIONAL/CONTESTED` or `Final authorized plan`. Historical Gameweeks continue to use frozen chronology-safe decision/projection records and are never reconstructed from current data.

## 11. C0238 — GitHub Pages / Playwright reliability

The GitHub Ubuntu runner changed its Google Chrome apt source from legacy `.list` form to deb822 `.sources`, causing a third-party apt hash mismatch during Playwright dependency installation.

C0238 now removes only apt-source files that actually reference `dl.google.com/linux/chrome`, regardless of `.list`/`.sources` format, and fails closed if any Chrome source remains before Playwright installs Chromium.

Verified product HEAD:

- commit `98956d091d768dee640fb4c869f654ad49a2f24c`
- workflow `34387458458`

Strict pipeline PASS:

- dependencies
- typecheck
- 21 unit tests
- production build
- bundle budget
- Chromium/OS dependency installation
- full Playwright E2E/accessibility
- reviewed deterministic visual baselines
- Pages artifact + rollback verification
- Pages deployment
- live legacy root integrity
- live `/v2/` integrity

No CI/E2E/visual gate was bypassed.

## 12. Governance state

Latest pre-documentation closeout proof:

- tracker rows: 163
- bad Change IDs: 0
- Completed-not-Verified: 0
- Completed-without-refs: 0
- decision rows without refs: 0
- consumption violations: 0
- required consumption contracts covered: **79/79**
- C0213 production behavioral tests: **14/14 PASS**
- C0227 uncertainty coverage: **604/604**, numeric model effect disabled

C0237/C0238 must be marked Completed / Verified only after closeout refs are stored and this governance proof is rerun.

## 13. Automations

`GW4 Daily PRE-FINAL` is enabled for Sep 10–12 Dubai time. It refreshes current decision inputs, uses only canonical C0217/C0235 cadence, runs every required C0227–C0234 layer, then publishes C0237 even when the plan is contested/provisional.

`GW4 Final Autonomy Gate` is enabled for **2026-09-12 14:30 Asia/Dubai**. It performs the final refresh and full stack. If C0234 authorizes, it writes a new append-only final manager plan and C0237 publication; otherwise it still publishes the best current fully evaluated plan while keeping execution unauthorized.

Neither automation executes external FPL transfers or chips.

## 14. Research layers still not silently promoted

Do not activate numeric production effects merely because these exist:

- C0197 research families / Tactical Clash
- C0202 player-side/flank research
- A0005
- W0002
- C0210 historical decay
- C0211 uncertainty widening as numeric effect
- C0216 MHTR
- C0224 Parity–Draw adjustment
- C0230 team-regime numeric adjustment

They may inform diagnostics/red-team only under their registered contracts.

## 15. Immediate sequence

1. Keep the C0237 GW4 PRE_FINAL plan publicly live and clearly non-final while inputs evolve.
2. Let canonical daily cadence generate the next immutable PRE_FINAL when due; do not force duplicate raw projection writes.
3. Refresh prices, availability, pressers, predicted XIs, tactical roles, set pieces and congestion before every meaningful publication.
4. Rerun the complete decision stack after each cadence-valid update; never skip a required layer.
5. At 2026-09-12 14:30 Dubai run the final T−2h refresh and C0234 authorization gate.
6. Only a genuinely authorized final decision may enter the final/execution ledger as FINAL.
7. Preserve all historical forecasts, prior publications and decision rows append-only.