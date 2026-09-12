# C0255 — Decisions & History Addendum

Date: 2026-09-13 (Dubai)
Status: COMPLETED / VERIFIED

This addendum preserves the durable product/serving decisions introduced by C0255 without changing football-model behavior.

## Durable decisions

1. **V3 is an isolated product, not a V2 redesign.** `frontend-v3/` and `/v3/` have a new light consumer identity and independent frontend architecture. V2 remains the rollback/fallback product at `/v2/`.
2. **Product state is split into four truth lanes:** Actual submitted team, Engine recommendation, Decision-time frozen projection, and Realized/live results. Client code must not collapse these lanes.
3. **Publication maturity and execution authority are separate.** `FINAL` does not imply authorization. Only explicit `execution_authorized=true` may be rendered as authorized.
4. **Unknown actual state remains unknown.** If no verified submitted-team record exists, the product states `Actual submitted team not verified`; it never substitutes the recommendation.
5. **Manager-state chronology is explicit.** Pre-transfer FT/bank/squad state may not be shown as the post-transfer state of a hypothetical recommendation.
6. **Fixture lifecycle is explicit.** FUTURE, LIVE and FINISHED are distinct; a started fixture is never presented as `Next`.
7. **Frozen evidence stays frozen.** Decision-time projections and pre-match probabilities remain labelled with their historical meaning after kickoff. Missing historical price/ownership evidence is not backfilled from current values.
8. **Serving source/runtime parity is a production gate.** A public V3 deployment requires repository/runtime parity for both `fpl-api` and `fpl-v3-workspace-api`, deterministic frontend builds, public-client API smoke, responsive/accessibility E2E and live Pages integrity.
9. **V2 preservation is a deployment invariant.** Pages artifact assembly and post-deploy checks must prove legacy root and `/v2/` remain intact while `/v3/` is published.
10. **C0255 has no numeric model effect.** It does not promote research, change coefficients, rewrite historical forecasts, weaken decision gates or create retrospective execution authority.

## Production proof

- PR #9 merged as `7fa27410b482aa5a002c5724e1e098c28d5732d7`.
- Final branch gate: Actions `34720566041` — green.
- PR gate: Actions `34720642769` — green.
- Production Pages: Actions `34720702295` — green.
- Pages deployment: `6414713753` — green.
- V3: `https://eldon-hanzy.github.io/football-intelligence-engine/v3/`.
- V2 fallback: `https://eldon-hanzy.github.io/football-intelligence-engine/v2/`.
- C0255 consumption contract: `C0255_V3_PRODUCT_SERVING_CONSUMPTION_V01` / `PRODUCTION_CONSUMER` / no numeric model effect.
- Final change-tracker governance: PASS, 94/94 governed consumption rows covered, zero violations.

This addendum should be read with `DECISIONS_AND_HISTORY.md` and `project-management/C0255_PRODUCTION_CLOSEOUT_20260913.md`.
