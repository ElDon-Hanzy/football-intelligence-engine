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

## Remaining P6 gate

The Pages workflow must run the authoritative Chromium matrix, deploy the bundle, and pass an independent desktop/mobile audit of all ten GW6 modals. P6 is not closed before that evidence is appended here.
