# C0237 — Always-Live FPL Plan Publication — Closeout

Date: 2026-09-09 (Dubai)
Status at closeout: Completed / Verified candidate pending final documentation-HEAD CI
Parent program: C0226 Autonomous FPL Decision Architecture

## Objective

Correct the serving semantics that previously treated `DECISION_NOT_READY` as equivalent to “publish no current plan.” The engine must always answer the practical question: **what is the best fully evaluated plan if the deadline were now?** Final execution authority is a separate question.

## Permanent decision contract

For the active Gameweek, the engine publishes one best-current plan whenever the complete required evaluation chain exists.

Publication timing stage and authorization status are independent:

- stage: `PRE_FINAL` or `FINAL`;
- status: `PROVISIONAL`, `CONTESTED`, or `FINAL`.

A negative model/layer verdict may downgrade a plan to `CONTESTED`; it does not suppress publication. A skipped mandatory layer blocks publication.

Only a publication that is `FINAL`, produced in the final stage, and backed by `FINAL_AUTONOMOUS_DECISION` may set `execution_authorized=true`.

`public.fpl_manager_plans` remains the separate final/execution ledger. C0237 does not weaken C0234 and does not itself execute an FPL transfer or chip.

## Required lineage

A C0237 publication requires the complete decision chain:

1. canonical full-pool optimizer;
2. C0227 uncertainty/sensitivity;
3. C0228 structural ensemble / equivalence classes;
4. C0229 structural robustness / portfolio control;
5. C0230 team-regime shadow diagnostic;
6. C0231 forward management / premium access;
7. C0232 OR/rank-aware leverage control;
8. C0233 adversarial red-team;
9. C0234 fail-closed final-authorization gate.

The persisted invariant is:

`ALL_REQUIRED_LAYERS_EVALUATED_NEGATIVE_RESULTS_ALLOWED_SKIPPED_LAYERS_FORBIDDEN`

## Shadow / research semantics

Shadow models are now publishable as public research evidence. They remain explicitly separated from production numeric effects:

- `research_only=true`;
- `numeric_production_effect=false`.

This allows parity-draw, team-regime and registered research experiments to be visible as evidence without silently altering production xPts or final decision authority.

## Supabase implementation

Migrations:

- `20260909173747_c0237_always_live_fpl_plan_publication_v01.sql`
- `20260909174251_c0237_require_complete_layer_lineage_v02.sql`

Primary objects:

- `public.fpl_live_plan_publications` — append-only publication ledger;
- `public.current_fpl_live_plan_v01` — current publication per Gameweek;
- `private.c0237_publish_current_fpl_plan_v01(integer, integer)` — fail-closed publisher.

Historical forecasts remain immutable. The publication table is guarded against update/delete mutation.

## API / UI implementation

`fpl-manager-plan-api` v6 serves the ledgers separately:

- `plan` — best current live publication when available;
- `live_plan` — detailed C0237 publication, blockers, lineage and research evidence;
- `saved_plan` — separate final/execution ledger;
- `research_only` — shadow/research evidence.

The FPL UI now labels a current plan as `Best current plan · PROVISIONAL/CONTESTED` or `Final authorized plan`. It explicitly states that a PRE_FINAL contested/provisional publication is not execution authority.

The old UI assumption that the saved manager-plan ledger must always be primary was removed. Historical frozen decisions remain chronology-safe and are not reconstructed from current projections.

## Current GW4 proof

Current publication at implementation closeout:

- Gameweek: 4
- Stage: `PRE_FINAL`
- Status: `CONTESTED`
- Execution authorized: `false`
- Prediction run: 1354
- Manager state: 4
- Required layers evaluated: true
- Research-only: true
- Research numeric production effect: false

Best-current normal-transfer plan:

- O'Reilly → Guéhi
- Mosquera → Gabriel
- Semenyo → Schade

Current captain: Gabriel
Current vice: Bruno Fernandes

This is intentionally published despite C0233/C0234 objections. It is the best current plan, not a final authorization claim.

## Automation integration

Both the GW4 daily PRE_FINAL automation and the 2026-09-12 14:30 Asia/Dubai final autonomy automation were updated to call C0237 after the complete decision stack.

Daily behavior:

- refresh decision inputs;
- use only canonical C0217/C0235 projection cadence;
- run all mandatory decision/research layers;
- publish C0237 even if final authorization is not available.

Final T−2h behavior:

- if C0234 returns `FINAL_AUTONOMOUS_DECISION`, save the final append-only manager plan and publish C0237 as FINAL/authorized;
- otherwise publish the best fully evaluated current plan as PROVISIONAL/CONTESTED with blockers and keep execution unauthorized.

No external FPL transfer or chip is executed by these jobs.

## C0238 deployment reliability repair

Strict Pages verification initially failed outside the application because the GitHub Ubuntu runner carried a stale Google Chrome apt source. The first mitigation handled legacy `.list` files only. A later runner image used modern deb822 `.sources` format and reproduced the apt hash mismatch.

C0238 was corrected to find and remove only source files that actually reference `dl.google.com/linux/chrome`, regardless of `.list`/`.sources` format, then fail closed if any such source remains before Playwright installs Chromium.

Verified runner evidence on workflow 34386679782 showed:

`C0238 disabling hosted-runner Chrome apt source: /etc/apt/sources.list.d/google-chrome.sources`

The Chromium installation then passed. The browser suite subsequently exposed intentional C0237 UI contract drift; the E2E semantic contract and only the reviewed FPL visual baselines were updated. No test or visual gate was disabled.

## Verification evidence

Product HEAD `98956d091d768dee640fb4c869f654ad49a2f24c` passed GitHub Pages workflow `34387458458` end to end:

- dependency install — PASS;
- TypeScript typecheck — PASS;
- 21 unit tests — PASS;
- production build — PASS;
- bundle budget — PASS;
- C0238 Chromium/OS dependency install — PASS;
- full Playwright E2E/accessibility — PASS;
- Pages artifact preparation — PASS;
- artifact/legacy rollback verification — PASS;
- Pages deployment — PASS;
- live legacy root integrity — PASS;
- live `/v2/` integrity — PASS.

The preceding failing workflow was retained as diagnostic evidence rather than bypassed.

## Governance proof before documentation closeout

Live Supabase proof before this documentation commit:

- tracker governance: `ok=true`;
- bad Change IDs: 0;
- Completed-not-Verified: 0;
- Completed-without-refs: 0;
- decision rows without refs: 0;
- consumption violations: 0;
- contracts covered: 79/79;
- C0213 production behavioral tests: 14/14 PASS on GW4 run 1354;
- C0227 uncertainty: 604/604 rows, `model_effect_enabled=false`.

A final governance rerun must be performed after C0237/C0238 tracker closeout.

## Integrity statement

C0237/C0238 introduce no retrospective forecast rewrite, no hidden numeric shadow-model promotion, no ownership/EO xPts multiplier, and no external FPL action. C0234 remains the final execution authority.