export type GameweekLifecycle = 'PRE_DEADLINE' | 'POST_DEADLINE_ACTIVE' | 'GW_COMPLETE';
export type FixturePhase = 'FUTURE' | 'LIVE' | 'FINISHED';
export type ActualVerificationStatus = 'VERIFIED' | 'NOT_VERIFIED';
export type RecommendationAuthorizationLabel =
  | 'AUTHORIZED_FINAL_RECOMMENDATION'
  | 'FINAL_FROZEN_NOT_AUTHORIZED'
  | 'PROVISIONAL_NOT_AUTHORIZED';

export type EvidenceTimestamp = {
  capturedAt: string;
  source: string;
};

export type ManagerEconomyState = {
  freeTransfers: number | null;
  bankTenths: number | null;
  capturedAt: string;
  source: string;
  basis: 'ACTUAL_MANAGER_STATE' | 'RECOMMENDATION_POST_ACTION';
};

export type ActualSubmittedState =
  | {
      verificationStatus: 'NOT_VERIFIED';
      reason: string;
      squad: null;
      managerEconomy: null;
    }
  | {
      verificationStatus: 'VERIFIED';
      capturedAt: string;
      source: string;
      squad: number[];
      startingXi: number[];
      benchOrder: number[];
      captainPlayerId: number | null;
      vicePlayerId: number | null;
      chip: string | null;
      managerEconomy: ManagerEconomyState | null;
    };

export type EngineRecommendationState = {
  publicationId: number;
  publicationStatus: string;
  finalStatus: string | null;
  executionAuthorized: boolean;
  capturedAt: string;
  predictionRunId: number | null;
  plannerRunId: number | null;
  autonomousGateRunId: number | null;
  squad: number[];
  startingXi: number[];
  benchOrder: number[];
  captainPlayerId: number | null;
  vicePlayerId: number | null;
  chip: string | null;
  transfers: unknown[];
  managerEconomy: ManagerEconomyState | null;
  frozenAfterDeadline: boolean;
};

export type DecisionSnapshotState = {
  predictionRunId: number;
  generatedAt: string;
  deadlineAt: string;
  modelVersion: string | null;
  playerEvidenceCapturedAt: string | null;
  priceOwnershipEvidence: EvidenceTimestamp | null;
};

export type RealizedState = {
  resultRunId: number | null;
  observedAt: string | null;
};

export type V3FplWorkspaceState = {
  gameweek: number;
  lifecycle: GameweekLifecycle;
  actual: ActualSubmittedState;
  recommendation: EngineRecommendationState | null;
  decisionSnapshot: DecisionSnapshotState | null;
  realized: RealizedState | null;
};

export function deriveGameweekLifecycle(params: {
  now: Date;
  deadlineAt: string;
  allFixturesFinished: boolean;
}): GameweekLifecycle {
  const deadline = new Date(params.deadlineAt).getTime();
  const now = params.now.getTime();

  if (!Number.isFinite(deadline)) {
    throw new Error('Invalid Gameweek deadline');
  }

  if (now < deadline) return 'PRE_DEADLINE';
  return params.allFixturesFinished ? 'GW_COMPLETE' : 'POST_DEADLINE_ACTIVE';
}

export function deriveFixturePhase(params: {
  now: Date;
  kickoffAt: string;
  finished: boolean;
}): FixturePhase {
  if (params.finished) return 'FINISHED';

  const kickoff = new Date(params.kickoffAt).getTime();
  const now = params.now.getTime();
  if (!Number.isFinite(kickoff)) throw new Error('Invalid fixture kickoff');

  return now >= kickoff ? 'LIVE' : 'FUTURE';
}

export function recommendationAuthorizationLabel(params: {
  publicationStatus: string;
  executionAuthorized: boolean;
}): RecommendationAuthorizationLabel {
  if (params.executionAuthorized && params.publicationStatus === 'FINAL') {
    return 'AUTHORIZED_FINAL_RECOMMENDATION';
  }
  if (params.publicationStatus === 'FINAL') {
    return 'FINAL_FROZEN_NOT_AUTHORIZED';
  }
  return 'PROVISIONAL_NOT_AUTHORIZED';
}

export function isRecommendationExecutionAuthorized(params: {
  executionAuthorized: boolean;
}): boolean {
  return params.executionAuthorized === true;
}

export function unverifiedActualSubmittedState(reason = 'Actual submitted team not verified'): ActualSubmittedState {
  return {
    verificationStatus: 'NOT_VERIFIED',
    reason,
    squad: null,
    managerEconomy: null,
  };
}

export function assertEconomyBelongsToState(
  economy: ManagerEconomyState | null,
  expectedBasis: ManagerEconomyState['basis'],
): void {
  if (!economy) return;
  if (economy.basis !== expectedBasis) {
    throw new Error(`Manager economy basis mismatch: expected ${expectedBasis}, received ${economy.basis}`);
  }
}

export function assertWorkspaceSemanticIntegrity(workspace: V3FplWorkspaceState): void {
  if (workspace.actual.verificationStatus === 'NOT_VERIFIED' && workspace.actual.managerEconomy !== null) {
    throw new Error('Unverified actual state cannot expose manager economy as verified actual state');
  }

  if (workspace.actual.verificationStatus === 'VERIFIED') {
    assertEconomyBelongsToState(workspace.actual.managerEconomy, 'ACTUAL_MANAGER_STATE');
  }

  if (workspace.recommendation) {
    assertEconomyBelongsToState(workspace.recommendation.managerEconomy, 'RECOMMENDATION_POST_ACTION');
  }

  if (
    workspace.recommendation?.publicationStatus === 'FINAL' &&
    workspace.recommendation.executionAuthorized === false &&
    recommendationAuthorizationLabel(workspace.recommendation) === 'AUTHORIZED_FINAL_RECOMMENDATION'
  ) {
    throw new Error('FINAL publication without execution authority cannot be authorized');
  }
}
