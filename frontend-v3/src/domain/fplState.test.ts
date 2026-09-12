import { describe, expect, it } from 'vitest';
import {
  assertWorkspaceSemanticIntegrity,
  deriveFixturePhase,
  deriveGameweekLifecycle,
  recommendationAuthorizationLabel,
  unverifiedActualSubmittedState,
  type V3FplWorkspaceState,
} from './fplState';

describe('C0255 V3 FPL semantic contract', () => {
  it('keeps a deadline-passed unfinished gameweek active', () => {
    expect(deriveGameweekLifecycle({
      now: new Date('2026-09-13T00:00:00Z'),
      deadlineAt: '2026-09-12T12:30:00Z',
      allFixturesFinished: false,
    })).toBe('POST_DEADLINE_ACTIVE');
  });

  it('moves to historical audit mode only after all fixtures finish', () => {
    expect(deriveGameweekLifecycle({
      now: new Date('2026-09-15T00:00:00Z'),
      deadlineAt: '2026-09-12T12:30:00Z',
      allFixturesFinished: true,
    })).toBe('GW_COMPLETE');
  });

  it('never maps FINAL to authorized without explicit execution authority', () => {
    expect(recommendationAuthorizationLabel({
      publicationStatus: 'FINAL',
      executionAuthorized: false,
    })).toBe('FINAL_FROZEN_NOT_AUTHORIZED');
  });

  it('marks an already-started unfinished fixture LIVE rather than future/next', () => {
    expect(deriveFixturePhase({
      now: new Date('2026-09-13T16:30:00Z'),
      kickoffAt: '2026-09-13T15:30:00Z',
      finished: false,
    })).toBe('LIVE');
  });

  it('represents a missing submitted team explicitly instead of inferring recommendation as actual', () => {
    expect(unverifiedActualSubmittedState()).toEqual({
      verificationStatus: 'NOT_VERIFIED',
      reason: 'Actual submitted team not verified',
      squad: null,
      managerEconomy: null,
    });
  });

  it('rejects pre-transfer actual economy attached to a recommendation state', () => {
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

    expect(() => assertWorkspaceSemanticIntegrity(workspace)).toThrow('Manager economy basis mismatch');
  });
});
