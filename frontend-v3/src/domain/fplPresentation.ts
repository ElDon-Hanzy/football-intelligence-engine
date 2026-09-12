export type PresentationFixturePhase = 'FUTURE' | 'LIVE' | 'FINISHED';

export function formationFromPositions(positions: string[]): string {
  const goalkeeperCount = positions.filter((position) => position === 'GKP').length;
  const defenders = positions.filter((position) => position === 'DEF').length;
  const midfielders = positions.filter((position) => position === 'MID').length;
  const forwards = positions.filter((position) => position === 'FWD').length;

  if (positions.length !== 11 || goalkeeperCount !== 1 || defenders < 3 || defenders > 5 || midfielders < 2 || midfielders > 5 || forwards < 1 || forwards > 3) {
    return 'INVALID';
  }
  return `${defenders}-${midfielders}-${forwards}`;
}

export function dominantFixturePhase(phases: PresentationFixturePhase[]): PresentationFixturePhase | null {
  if (phases.length === 0) return null;
  if (phases.some((phase) => phase === 'LIVE')) return 'LIVE';
  if (phases.every((phase) => phase === 'FINISHED')) return 'FINISHED';
  return 'FUTURE';
}

export function authorizationDisplay(publicationStatus: string, executionAuthorized: boolean): string {
  if (publicationStatus === 'FINAL' && executionAuthorized) return 'Authorized final recommendation';
  if (publicationStatus === 'FINAL') return 'Final frozen recommendation · not authorized';
  return 'Provisional recommendation · not authorized';
}
