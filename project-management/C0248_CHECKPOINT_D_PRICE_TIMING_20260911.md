# C0248 Checkpoint D — First-Party Price Timing Control

Date: 2026-09-11
Status: SHADOW / VERIFIED CHECKPOINT
Parent: C0248

## Purpose

Add price-change timing to the consolidated sequential planner without creating an independent decision layer or changing player xPts.

## First-party source

Verified directly against the live official FPL `bootstrap-static` payload. The player object exposes:

- `price_change_percent`
- `price_change_hourly_rate`
- `price_change_calibrating`
- `price_change_locked_until`
- `price_change_projections`
- `transfers_in_event`
- `transfers_out_event`

Identity is joined through `public.players.fpl_player_id`; internal `players.id` must never be treated as the official FPL element id unless they happen to match.

## Storage

Created append-only `public.fpl_price_predictor_snapshots` plus service-role-only `public.current_fpl_price_predictor_v01`.

Initial verified capture inserted 655/655 mapped players from the official payload.

## Timing evaluator

`private.c0248_price_timing_status_v01(gw,horizon)` evaluates each root-preserved C0248 first action against the next official price update.

Policy:

1. Price evidence never creates a football transfer.
2. It may accelerate an already robust transfer only when waiting creates material affordability/selling-value risk.
3. Official predictor values are guidance, not guarantees.
4. Current purchase price and FPL selling-value rules are used for outgoing assets.
5. Information value is preferred when the path remains affordable.

## GW4 result

All preserved roots currently classify `NO_MATERIAL_NEXT_UPDATE_RISK` and `WAIT_FOR_INFORMATION`:

- C0240 4FT/-4
- C0228 2FT baseline
- named 2FT Guéhi + De Cuyper
- ROLL

For the named 2FT route:

- De Cuyper projected next-update progress: 21.1%
- Guéhi: 52.0%
- Mosquera: -53.6%
- O'Reilly: -13.2%
- expected buy-cost increase: 0 tenths
- expected sell-value loss: 0 tenths
- post-transfer bank: 10 tenths

Therefore there is no price-based justification for executing early. Continue to value press-conference / availability / final-refresh information.

## Integrity

- no xPts rewrite
- no historical forecast rewrite
- no external transfer execution
- no manager-plan mutation
- predictor remains decision-timing evidence only
