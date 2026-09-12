# C0255 Checkpoint A — V3 Semantic Workspace API

Date: 2026-09-13
Status: VERIFIED PRIVATE FOUNDATION

## Scope

Establish and prove the V3 semantic serving boundary before wiring the consumer UI.

No model behavior, historical forecast, V2 source or public route was changed.

## Deployed private contract

Edge Function: `fpl-v3-workspace-api`

- version: 1
- contract: `fpl_v3_workspace_v01`
- JWT verification: enabled
- deployed bundle SHA-256: `7d540a2d255f87df6608bd11257b2024cc7c327f02bfa658c7b1a3c845bd2cb7`
- committed source before deployment: `supabase/functions/fpl-v3-workspace-api/index.ts`
- source commit: `502a2f60d964ba9f198ad4d604fd10ddf82e9e9a`

The function is isolated from V2. V2 does not call it.

## Live GW4 integration proof

Authenticated request #5713 returned HTTP 200.

Observed semantic state:

- lifecycle: `POST_DEADLINE_ACTIVE`;
- actual submitted team: `NOT_VERIFIED`;
- actual manager economy: null;
- recommendation publication: #34;
- publication status: `FINAL`;
- execution authorized: false;
- authorization label: `FINAL_FROZEN_NOT_AUTHORIZED`;
- frozen after deadline: true;
- prediction run: 1365;
- recommendation post-action economy: 1 FT, £1.4m bank;
- recommendation economy basis: `RECOMMENDATION_POST_ACTION` from the selected C0248 first action;
- decision-time price/ownership: `NOT_CAPTURED`, therefore no current-value backfill;
- historical forecasts rewritten: false.

Fixture phase proof at request time:

- finished fixtures rendered `FINISHED`;
- Sunderland vs Arsenal, already started and unfinished, rendered `LIVE` rather than `Next`/future;
- remaining later fixtures rendered `FUTURE`.

## Defects closed at the V3 serving boundary

1. `FINAL` cannot create authorization when `execution_authorized=false`.
2. Missing actual manager decision cannot be replaced by the engine recommendation.
3. Pre-transfer manager FT/bank cannot be attached to the recommended post-transfer squad.
4. Recommendation economy is sourced only from the same selected recommendation path.
5. Started fixtures cannot be classified as upcoming.
6. Missing decision-time price/ownership cannot be silently replaced with later live metadata.
7. Transferred-in recommendation players are present in the recommendation squad/player catalogue rather than being resolved only from the old squad.

## Governance

C0255 remains `In Progress / Implementation`.

Post-update tracker governance:

- audit: PASS;
- bad change IDs: 0;
- completed-not-verified: 0;
- completed-without-refs: 0;
- consumption-governance violations: 0.

## Remaining Checkpoint-A blocker

Legacy production `fpl-api` remains source/runtime drifted: production v18 is newer than the committed legacy source. C0255 preserves that correct runtime and keeps the V3 public deployment gate fail-closed until reproducibility is restored safely.

This legacy drift does not invalidate the new V3 API proof, because `fpl-v3-workspace-api` was committed before deployment and is an isolated serving contract. It remains an overall public-release blocker under the C0255 reproducibility requirement.

## Next implementation increment

Build the consumer FPL workspace on top of `fpl_v3_workspace_v01`:

- frozen decision-time player evidence and fixture/opponent labels;
- formation-aware reusable `FplPitch`;
- pitch/list toggle and separate bench;
- Engine / Actual / Live state selector;
- responsive mobile/tablet/desktop behavior.
