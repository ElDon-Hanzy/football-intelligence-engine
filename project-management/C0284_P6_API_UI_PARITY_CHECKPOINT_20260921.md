# C0284 P6 — API/UI Parity Checkpoint

**State:** implementation saved; protected deployment/browser verification pending  
**Protected state:** GW6 freeze unchanged; zero publication-authorized rows; C0265 and historical forecasts untouched

## Implemented

- V3 parses the complete `c0284_decision_evidence_v01` contract.
- Alignment fails closed unless match ID, snapshot ID and decision hash match the canonical fixture prediction.
- The modal renders conclusion, five decision targets, signed weighted inputs, explicitly zero-effect observed context, targeted risks, reliability, synthesis, P7-gated player implications, cutoff and evidence hash.
- Previous/next navigation cycles through the ten matchup modals.
- The ambiguous lambda label remains `Projected goals`; no-edge and near-tie semantics remain canonical.

## Verified before deployment

- Live database: 10 fixtures, 10 unique snapshots, 10 canonical contracts, 10 valid decision hashes.
- Live `fpl-api` versus `fixture-facts-api`: 10/10 fixtures; zero snapshot, decision-hash, lambda, target, contribution or risk-target mismatches.
- Each fixture: five targets and four genuine non-zero model inputs; contextual evidence has zero weight/effect/contribution.
- Local: TypeScript pass, production build pass, 20/20 domain-contract tests pass, diff integrity pass.
- The protected smoke was corrected for the real GW rollover: the live catalog is GW6 while the latest authorized/default FPL workspace remains completed GW5 until P7. It now validates the latest available workspace against its matching actual/live contract without fabricating a GW6 decision cycle. The live smoke passed with `execution_authorized=false`.
- Pages run #1006 passed 112 V2 browser cases but exposed two stale live-population assumptions that required a GW6 manager plan. The V2 gate now accepts the explicit fail-closed state only when plan/saved-plan/live-plan/manager-state are null and `missing_manager_state_is_not_zero=true`; it still requires 11 starters and four bench players whenever a plan exists. V2 typecheck and 24/24 unit tests pass.
- Pages run #1007 confirmed the manager-plan correction. Remaining V2 blockers were a transient `fixture-facts-api` HTTP 500 and a predicted-XI assertion that ignored the absent GW6 plan. The facts API gate remains strict; expected-XI completeness now applies when a plan exists, and browser QA accepts the explicit FPL unavailable panel during a live API incident rather than requiring populated content or allowing a silent blank. The facts API subsequently returned 200 with 10 fixtures and the canonical evidence contract.
- Pages run #1008 passed builds, serving parity, the live V3 workspace smoke and 111 V2 browser cases. Its remaining failures exposed two independent conditions: Supabase endpoints degraded during the matrix, and V2's central fetcher had no bounded timeout, leaving the FPL page on a skeleton instead of reaching its explicit fail-closed panel. V2 now applies the same 20-second request bound as V3, treats a failed core FPL contract as unavailable even if the manager endpoint responds, retries the isolated historical API assertion, and accepts an explicitly blocked pre-P7 projection-readiness contract only when blockers are present. Typecheck, 24/24 unit tests and production build pass. No data gate was weakened.
- At the checkpoint, Supabase's public status reports API Gateway degraded performance. Repeated production probes, including a trivial SQL connection, timed out. The next protected deployment must wait for clean endpoint health; publication remains blocked.

## Remaining P6 gate

The Pages workflow must run the authoritative Chromium matrix, deploy the bundle, and pass an independent desktop/mobile audit of all ten GW6 modals. P6 is not closed before that evidence is appended here.
