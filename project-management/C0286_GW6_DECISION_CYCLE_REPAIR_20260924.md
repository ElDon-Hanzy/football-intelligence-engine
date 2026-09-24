# C0286 — GW6 decision-cycle repair — 2026-09-24

## Scope

Restore a truthful pre-deadline GW6 FPL recommendation without presenting the
verified GW5 submitted team as a GW6 decision and without making an external
FPL action.

## Evidence baseline

- GW6 deadline: 2026-10-10 10:00 UTC; the cycle is pre-deadline.
- Latest aligned pre-deadline projection: run **1846** (it supersedes 1461 and
  1845 for the same current fixture state).
- Verified submitted team remains GW5 decision `fpl_actual_manager_decisions`
  id 3.
- User-confirmed state: no changes since the verified GW5 Palmer → Saka swap.
  Snapshot 6 records this as `C0286_USER_CONFIRMED_GW6_BASELINE_V01`; it is
  human evidence, not an external FPL transaction.

## Root causes found

1. C0276 instantiated the refreshed GW6 cycle without binding the current
   player-projection artifact.
2. C0276 and C0284 calculated fixture lineage with incompatible signatures.
3. C0240 adversarial preparation joined an all-history role view and intersected
   independent prediction indexes, exceeding the cron statement timeout.
4. C0242 required a live publication even though captaincy precedes publication
   in the C0276 DAG, creating a bootstrap cycle.

## Repairs

- `20260924001500`: bind the current projection artifact on C0276 cycle
  creation/reopen.
- `20260924002500`: use the C0284 canonical SHA-256 fixture contract for the
  cycle signature.
- `20260924003500` and `20260924004500`: add targeted lookup indexes and scope
  C0240 role evidence to the requested gameweek before choosing latest player
  observations. `c0240_prepare_base_v05(6,3)` completed in about nine seconds
  and prepared batch 356 (29 bounded tasks).
- `20260924005500` and `20260924006000`: permit C0242 to evaluate the exact
  current C0248 unpublished selected-path candidate when no publication exists.
  The response identifies `C0248_UNPUBLISHED_SELECTED_CANDIDATE` and
  `candidate_is_not_publication=true`; it cannot authorise execution.

## Current governed state

- Cycle 5: GW6/horizon 3, projection 1846, manager state 6.
- Captaincy is current and aligned to run 1846. Mbeumo is nominal/tail leader;
  Bruno Fernandes is floor leader; the mean decision class is
  `NO_MEANINGFUL_EDGE`.
- The sequential candidate remains pre-final and unpublished: Kevin Schade for
  Foden, no chip, Mbeumo captain, Bruno Fernandes vice. This is not a confirmed
  FPL action.
- C0240 batch 356 is still completing its bounded adversarial tasks. Only an
  exact-lineage final adversarial artifact may advance publication.

## Invariants retained

- Requested gameweek, payload gameweek, fixture state and prediction run must
  agree before V3 renders a current surface.
- Cross-GW evidence is explicitly labelled (GW5 verified baseline for GW6
  planning) and never rendered as a GW6 result or decision.
- Publication is pre-final until the full governed chain completes; external
  FPL execution remains false.

## V3 FPL UI follow-up

- The GW6 submitted-team lane remains fail-closed: no `fpl_actual_manager_decisions`
  row exists before deadline, so it must not be labelled verified. The UI now
  explains that this is a pre-deadline limitation rather than a failed sync.
- The league-wide Top 10 frozen xPts board follows **Data details**.
- Mobile dialogs use the dynamic viewport and safe-area inset so their header
  and close control do not sit underneath browser chrome.
