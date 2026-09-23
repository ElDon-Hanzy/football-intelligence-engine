import assert from 'node:assert/strict';
import test from 'node:test';
import { assertFixtureIdsBelongToGameweek, assertRequestedGameweek } from './gameweekIntegrity.ts';

test('accepts an explicitly requested matching Gameweek', () => {
  assert.equal(assertRequestedGameweek(6, 6, 'test'), 6);
});

test('fails closed when a selected Gameweek receives another payload Gameweek', () => {
  assert.throws(() => assertRequestedGameweek(6, 5, 'test'), /requested GW6, received GW5/);
});

test('fails closed when fixture identity is incomplete or duplicated', () => {
  assert.throws(() => assertFixtureIdsBelongToGameweek(6, [{ match_id: 0 }], 'test'), /fixture lineage mismatch/);
  assert.throws(() => assertFixtureIdsBelongToGameweek(6, [{ match_id: 51 }, { match_id: 51 }], 'test'), /fixture lineage mismatch/);
  assert.doesNotThrow(() => assertFixtureIdsBelongToGameweek(6, [{ match_id: 51 }, { match_id: 60 }], 'test'));
});
