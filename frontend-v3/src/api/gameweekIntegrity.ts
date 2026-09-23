export function assertRequestedGameweek(requestedGameweek: number, payloadGameweek: unknown, contract: string): number {
  const receivedGameweek = Number(payloadGameweek);
  if (!Number.isInteger(receivedGameweek) || receivedGameweek < 1 || receivedGameweek > 38) {
    throw new Error(`${contract} Gameweek contract mismatch`);
  }
  if (requestedGameweek > 0 && receivedGameweek !== requestedGameweek) {
    throw new Error(`${contract} Gameweek mismatch: requested GW${requestedGameweek}, received GW${receivedGameweek}`);
  }
  return receivedGameweek;
}

export function assertFixtureIdsBelongToGameweek(
  requestedGameweek: number,
  fixtures: Array<{ match_id: number }> | undefined,
  contract: string,
): void {
  if (requestedGameweek < 1 || !fixtures?.length) return;
  const ids = fixtures.map((fixture) => fixture.match_id);
  if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
    throw new Error(`${contract} fixture lineage mismatch for GW${requestedGameweek}`);
  }
}
