import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizationDisplay,
  dominantFixturePhase,
  formationFromPositions,
} from './fplPresentation';

test('formation helper resolves the current GW4 engine XI as 3-5-2', () => {
  assert.equal(
    formationFromPositions(['GKP', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD']),
    '3-5-2',
  );
});

test('formation helper fails closed on an illegal or incomplete XI', () => {
  assert.equal(formationFromPositions(['GKP', 'DEF', 'DEF', 'MID', 'MID', 'FWD']), 'INVALID');
});

test('LIVE dominates mixed player fixture context', () => {
  assert.equal(dominantFixturePhase(['FINISHED', 'LIVE']), 'LIVE');
});

test('finished-only fixture context stays FINISHED', () => {
  assert.equal(dominantFixturePhase(['FINISHED']), 'FINISHED');
});

test('FINAL does not display authorized language without explicit execution authority', () => {
  assert.equal(authorizationDisplay('FINAL', false), 'Final frozen recommendation · not authorized');
  assert.equal(authorizationDisplay('FINAL', true), 'Authorized final recommendation');
});
