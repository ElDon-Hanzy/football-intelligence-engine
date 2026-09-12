import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertWorkspaceSemanticIntegrity,
  deriveFixturePhase,
  deriveGameweekLifecycle,
  recommendationAuthorizationLabel,
  unverifiedActualSubmittedState,
  type V3FplWorkspaceState,
} from './fplState.ts';

test('keeps a deadline-passed unfinished gameweek active', () => {
  assert.equal(deriveGameweekLifecycle({
    now: new Date('2026-09-13T00:00:00Z'),
    deadlineAt: '2026-09-12T12:30:00Z',
    allFixturesFinished: false,
  }), 'POST_DEADLINE_ACTIVE');
});

test('moves to historical audit mode only after all fixtures finish', () => {
  assert.equal(deriveGameweekLifecycle({
    now: new Date('2026-09-15T00:00:00Z'),
    deadlineAt: '2026-09-12T12:30:00Z',
    allFixturesFinished: true,
  }), 'GW_COMPLETE');
});

test('never maps FINAL to authorized without explicit execution authority', () => {
  assert.equal(recommendationAuthorizationLabel({
    publicationStatus: 'FINAL',
    executionAuthorized: false,
  }), 'FINAL_FROZEN_NOT_AUTHORIZED');
});

test('marks an already-started unfinished fixture LIVE rather than future/next', () => {
  assert.equal(deriveFixturePhase({
    now: new Date('2026-09-13T16:30:00Z'),
    kickoffAt: '2026-09-13T15:30:00Z',
    finished: false,
  }), 'LIVE');
});

test('represents a missing submitted team explicitly instead of inferring recommendation as actual', () => {
  assert.deepEqual(unverifiedActualSubmittedState(), {
    verificationStatus: 'NOT_VERIFIED',
    reason: 'Actual submitted team not verified',
    squad: null,
    managerEconomy: null,
  });
});

test('rejects pre-transfer actual economy attached to a recommendation state', () => {
  const workspace: V3FplWorkspaceState = {
    gameweek: 4,
    lifecycle: 'POST_DEADLINE_ACTIVE',
    actual: unverifiedActualSubmittedState(),
    recommendation: {
      publicationId: 34,
      publicationStatus: 'FINAL',
      finalStatus: 'FINAL_POST_DEADLINE_CLOSURE',
      executionAuthorized: false,
      capturedAt: '2026-09-12T16:28:17.048778Z',
      predictionRunId: 1365,
      plannerRunId: 29,
      autonomousGateRunId: null,
      squad: [112, 4, 427],
      startingXi: [112, 4, 427],
      benchOrder: [],
      captainPlayerId: 4,
      vicePlayerId: 470,
      chip: 'NONE',
      transfers: [],
      frozenAfterDeadline: true,
      managerEconomy: {
        freeTransfers: 3,
        bankTenths: 0,
        capturedAt: '2026-09-08T07:58:57.380401Z',
        source: 'c0218_current_price_liquidation_refresh',
        basis: 'ACTUAL_MANAGER_STATE',
      },
    },
    decisionSnapshot: null,
    realized: null,
  };

  assert.throws(() => assertWorkspaceSemanticIntegrity(workspace), /Manager economy basis mismatch/);
});
