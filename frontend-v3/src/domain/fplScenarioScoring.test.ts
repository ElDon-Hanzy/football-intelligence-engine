import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreFplScenario, type FplScenarioPlayer, type FplScenarioSelection } from './fplScenarioScoring.ts';

const selection: FplScenarioSelection = {
  startingXi: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  benchOrder: [12, 13, 14, 15],
  captainId: 8,
  viceId: 9,
  chip: 'NONE',
};

function players(overrides: Partial<Record<number, Partial<FplScenarioPlayer>>> = {}): FplScenarioPlayer[] {
  const positions: Record<number, string> = {
    1: 'GKP', 2: 'DEF', 3: 'DEF', 4: 'DEF', 5: 'DEF', 6: 'MID', 7: 'MID', 8: 'MID', 9: 'MID', 10: 'FWD', 11: 'FWD',
    12: 'GKP', 13: 'MID', 14: 'DEF', 15: 'FWD',
  };
  return Object.entries(positions).map(([key, position]) => {
    const playerId = Number(key);
    return {
      playerId,
      position,
      expectedPoints: playerId,
      actualPoints: playerId,
      minutes: 90,
      played: true,
      status: 'FINAL',
      ...overrides[playerId],
    } as FplScenarioPlayer;
  });
}

test('captain points and frozen xPts are doubled in normal scoring', () => {
  const score = scoreFplScenario(selection, players());
  assert.equal(score.realizedPoints, 74); // 1..11 = 66, plus captain 8
  assert.equal(score.frozenXpts, 74);
  assert.equal(score.captainAppliedTo, 8);
  assert.equal(score.captainMultiplier, 2);
  assert.equal(score.settled, true);
});

test('vice inherits captain multiplier when captain is a confirmed no-show', () => {
  const score = scoreFplScenario(selection, players({ 8: { actualPoints: 0, minutes: 0, played: false, status: 'FINAL' } }));
  assert.equal(score.captainAppliedTo, 9);
  assert.equal(score.captainMultiplier, 2);
});

test('goalkeeper automatic substitution uses reserve goalkeeper only', () => {
  const score = scoreFplScenario(selection, players({ 1: { actualPoints: 0, minutes: 0, played: false, status: 'FINAL' } }));
  assert.deepEqual(score.autosubbedOut, [1]);
  assert.deepEqual(score.autosubbedIn, [12]);
  assert.equal(score.scoringPlayerIds.includes(12), true);
});

test('outfield automatic substitution respects minimum formation', () => {
  const score = scoreFplScenario(selection, players({ 2: { actualPoints: 0, minutes: 0, played: false, status: 'FINAL' } }));
  assert.deepEqual(score.autosubbedOut, [2]);
  assert.deepEqual(score.autosubbedIn, [13]); // 4 DEF -> 3 DEF remains legal, so first outfield sub is valid
});

test('three-defender formation cannot replace a missing defender with a midfielder', () => {
  const threeDef: FplScenarioSelection = { ...selection, startingXi: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 15], benchOrder: [12, 13, 14, 5] };
  const score = scoreFplScenario(threeDef, players({ 2: { actualPoints: 0, minutes: 0, played: false, status: 'FINAL' } }));
  assert.deepEqual(score.autosubbedIn, [14]);
  assert.deepEqual(score.autosubbedOut, [2]);
});

test('Triple Captain triples captain score and xPts', () => {
  const score = scoreFplScenario({ ...selection, chip: '3XC' }, players());
  assert.equal(score.realizedPoints, 82); // 66 + two extra captain scores
  assert.equal(score.frozenXpts, 82);
  assert.equal(score.captainMultiplier, 3);
});

test('Bench Boost scores all 15 players and does not perform autosubs', () => {
  const score = scoreFplScenario({ ...selection, chip: 'bboost' }, players());
  assert.equal(score.scoringPlayerIds.length, 15);
  assert.deepEqual(score.autosubbedIn, []);
  assert.equal(score.benchBoost, true);
  assert.equal(score.realizedPoints, 128); // 1..15 = 120 plus captain 8
});

test('live scenario stays provisional until all 15 player states are final', () => {
  const score = scoreFplScenario(selection, players({ 15: { actualPoints: null, minutes: null, played: null, status: 'PENDING' } }));
  assert.equal(score.settled, false);
  assert.equal(score.realizedPoints, 74);
});

test('fails closed when a scenario player is missing', () => {
  const facts = players().filter((player) => player.playerId !== 15);
  const score = scoreFplScenario(selection, facts);
  assert.equal(score.realizedPoints, null);
  assert.equal(score.frozenXpts, null);
  assert.match(score.reason ?? '', /incomplete/i);
});
