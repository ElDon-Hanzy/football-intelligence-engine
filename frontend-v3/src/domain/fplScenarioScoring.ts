export type FplScenarioStatus = 'FINAL' | 'LIVE' | 'PARTIAL' | 'PENDING';

export type FplScenarioPlayer = {
  playerId: number;
  position: string;
  expectedPoints: number | null;
  actualPoints: number | null;
  minutes: number | null;
  played: boolean | null;
  status: FplScenarioStatus;
};

export type FplScenarioSelection = {
  startingXi: number[];
  benchOrder: number[];
  captainId: number | null;
  viceId: number | null;
  chip: string | null;
};

export type FplScenarioScore = {
  realizedPoints: number | null;
  frozenXpts: number | null;
  actualCoverage: number;
  projectionCoverage: number;
  settled: boolean;
  scoringPlayerIds: number[];
  autosubbedIn: number[];
  autosubbedOut: number[];
  captainAppliedTo: number | null;
  captainMultiplier: 1 | 2 | 3;
  benchBoost: boolean;
  reason: string | null;
};

type AppearanceState = 'PLAYED' | 'NO_SHOW' | 'UNKNOWN';

const minimumFormation = { GKP: 1, DEF: 3, MID: 2, FWD: 1 } as const;

function normalizeChip(chip: string | null | undefined) {
  return String(chip ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isBenchBoost(chip: string | null | undefined) {
  const value = normalizeChip(chip);
  return value === 'BENCHBOOST' || value === 'BBOOST' || value === 'BB';
}

function isTripleCaptain(chip: string | null | undefined) {
  const value = normalizeChip(chip);
  return value === 'TRIPLECAPTAIN' || value === '3XC' || value === 'TC';
}

function appearance(player: FplScenarioPlayer | undefined): AppearanceState {
  if (!player) return 'UNKNOWN';
  if (player.played === true) return 'PLAYED';
  if (player.status === 'FINAL' && player.played === false) return 'NO_SHOW';
  return 'UNKNOWN';
}

function positionCounts(ids: number[], byId: Map<number, FplScenarioPlayer>) {
  const counts = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const id of ids) {
    const position = byId.get(id)?.position;
    if (position === 'GKP' || position === 'DEF' || position === 'MID' || position === 'FWD') counts[position] += 1;
  }
  return counts;
}

function legalFormation(ids: number[], byId: Map<number, FplScenarioPlayer>) {
  if (ids.length !== 11) return false;
  const counts = positionCounts(ids, byId);
  return counts.GKP === 1
    && counts.DEF >= minimumFormation.DEF
    && counts.MID >= minimumFormation.MID
    && counts.FWD >= minimumFormation.FWD;
}

function projectedTotal(ids: number[], captainId: number | null, captainMultiplier: 1 | 2 | 3, byId: Map<number, FplScenarioPlayer>) {
  const values = ids.map((id) => byId.get(id)?.expectedPoints ?? null);
  const captured = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (captured.length !== ids.length) return { total: null, coverage: captured.length };
  let total = captured.reduce<number>((sum, value) => sum + value, 0);
  if (captainId != null && captainMultiplier > 1) {
    const captainExpected = byId.get(captainId)?.expectedPoints;
    if (typeof captainExpected !== 'number' || !Number.isFinite(captainExpected)) return { total: null, coverage: captured.length };
    total += captainExpected * (captainMultiplier - 1);
  }
  return { total, coverage: captured.length };
}

function realizedTotal(ids: number[], captainId: number | null, captainMultiplier: 1 | 2 | 3, byId: Map<number, FplScenarioPlayer>) {
  const visible = ids.map((id) => byId.get(id)?.actualPoints ?? null);
  const captured = visible.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (captured.length === 0) return { total: null, coverage: 0 };
  let total = visible.reduce<number>((sum, value) => sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0), 0);
  if (captainId != null && captainMultiplier > 1) {
    const captainPoints = byId.get(captainId)?.actualPoints;
    if (typeof captainPoints === 'number' && Number.isFinite(captainPoints)) total += captainPoints * (captainMultiplier - 1);
  }
  return { total, coverage: captured.length };
}

function captainTarget(selection: FplScenarioSelection, byId: Map<number, FplScenarioPlayer>) {
  const captainState = selection.captainId == null ? 'UNKNOWN' : appearance(byId.get(selection.captainId));
  if (selection.captainId != null && captainState !== 'NO_SHOW') return selection.captainId;
  if (selection.viceId == null) return null;
  return appearance(byId.get(selection.viceId)) === 'NO_SHOW' ? null : selection.viceId;
}

function settleScoringIds(selection: FplScenarioSelection, byId: Map<number, FplScenarioPlayer>) {
  if (selection.startingXi.length !== 11 || selection.benchOrder.length !== 4) {
    return { ids: [] as number[], autosubbedIn: [] as number[], autosubbedOut: [] as number[], reason: 'Selection must contain 11 starters and 4 bench players.' };
  }
  const squad = [...selection.startingXi, ...selection.benchOrder];
  if (new Set(squad).size !== 15 || squad.some((id) => !byId.has(id))) {
    return { ids: [] as number[], autosubbedIn: [] as number[], autosubbedOut: [] as number[], reason: 'Scenario player evidence is incomplete.' };
  }

  if (isBenchBoost(selection.chip)) {
    return { ids: squad, autosubbedIn: [] as number[], autosubbedOut: [] as number[], reason: null };
  }

  const active = [...selection.startingXi];
  const autosubbedIn: number[] = [];
  const autosubbedOut: number[] = [];
  const usedBench = new Set<number>();

  const startingGkIndex = active.findIndex((id) => byId.get(id)?.position === 'GKP');
  const startingGkId = startingGkIndex >= 0 ? active[startingGkIndex] : undefined;
  if (startingGkId != null && appearance(byId.get(startingGkId)) === 'NO_SHOW') {
    const benchGk = selection.benchOrder.find((id) => byId.get(id)?.position === 'GKP' && appearance(byId.get(id)) === 'PLAYED');
    if (benchGk != null) {
      autosubbedOut.push(startingGkId);
      autosubbedIn.push(benchGk);
      usedBench.add(benchGk);
      active[startingGkIndex] = benchGk;
    }
  }

  for (let index = 0; index < active.length; index += 1) {
    const starterId = active[index];
    if (starterId == null) continue;
    const starter = byId.get(starterId);
    if (!starter || starter.position === 'GKP' || appearance(starter) !== 'NO_SHOW') continue;

    for (const candidateId of selection.benchOrder) {
      if (usedBench.has(candidateId)) continue;
      const candidate = byId.get(candidateId);
      if (!candidate || candidate.position === 'GKP' || appearance(candidate) !== 'PLAYED') continue;
      const proposed = [...active];
      proposed[index] = candidateId;
      if (!legalFormation(proposed, byId)) continue;
      autosubbedOut.push(starterId);
      autosubbedIn.push(candidateId);
      usedBench.add(candidateId);
      active[index] = candidateId;
      break;
    }
  }

  return { ids: active, autosubbedIn, autosubbedOut, reason: null };
}

export function scoreFplScenario(selection: FplScenarioSelection, players: FplScenarioPlayer[]): FplScenarioScore {
  const byId = new Map(players.map((player) => [player.playerId, player]));
  const settled = settleScoringIds(selection, byId);
  if (settled.reason) {
    return {
      realizedPoints: null,
      frozenXpts: null,
      actualCoverage: 0,
      projectionCoverage: 0,
      settled: false,
      scoringPlayerIds: [],
      autosubbedIn: [],
      autosubbedOut: [],
      captainAppliedTo: null,
      captainMultiplier: 1,
      benchBoost: isBenchBoost(selection.chip),
      reason: settled.reason,
    };
  }

  const multiplier: 1 | 2 | 3 = isTripleCaptain(selection.chip) ? 3 : 2;
  const captainAppliedTo = captainTarget(selection, byId);
  const projected = projectedTotal(settled.ids, captainAppliedTo, captainAppliedTo == null ? 1 : multiplier, byId);
  const realized = realizedTotal(settled.ids, captainAppliedTo, captainAppliedTo == null ? 1 : multiplier, byId);
  const allScenarioEvidenceSettled = [...selection.startingXi, ...selection.benchOrder].every((id) => {
    const player = byId.get(id);
    return player?.status === 'FINAL'
      && typeof player.actualPoints === 'number'
      && Number.isFinite(player.actualPoints)
      && typeof player.played === 'boolean';
  });

  return {
    realizedPoints: realized.total,
    frozenXpts: projected.total,
    actualCoverage: realized.coverage,
    projectionCoverage: projected.coverage,
    settled: allScenarioEvidenceSettled,
    scoringPlayerIds: settled.ids,
    autosubbedIn: settled.autosubbedIn,
    autosubbedOut: settled.autosubbedOut,
    captainAppliedTo,
    captainMultiplier: captainAppliedTo == null ? 1 : multiplier,
    benchBoost: isBenchBoost(selection.chip),
    reason: null,
  };
}
