import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStats, recordAnswer, pieceWeight, pickWeighted, mostCommonWrong, accuracy, loadStats, saveStats,
} from '../src/stats.js';

test('recordAnswer tracks attempts, accuracy, time and wrong answers', () => {
  const s = emptyStats();
  recordAnswer(s, 'J', 'J', 1000);
  recordAnswer(s, 'J', 'L', 2000);
  recordAnswer(s, 'J', 'L', 3000);
  const j = s.pieces.J;
  assert.equal(j.attempts, 3);
  assert.equal(accuracy(j), 1 / 3);
  assert.equal(j.totalMs, 6000);
  assert.deepEqual(mostCommonWrong(j), { id: 'L', count: 2 });
});

test('weaker pieces and J/L mix-ups get more weight', () => {
  const s = emptyStats();
  for (let i = 0; i < 5; i++) recordAnswer(s, 'O', 'O', 500);
  for (let i = 0; i < 3; i++) recordAnswer(s, 'J', 'L', 900);
  assert.ok(pieceWeight(s, 'J') > pieceWeight(s, 'T'), 'J (wrong) > T (unseen)');
  assert.ok(pieceWeight(s, 'T') > pieceWeight(s, 'O'), 'T (unseen) > O (mastered)');
  assert.ok(pieceWeight(s, 'L') > pieceWeight(s, 'T'), 'partner L gets boosted too');
});

test('weight recovers once you improve', () => {
  const s = emptyStats();
  for (let i = 0; i < 5; i++) recordAnswer(s, 'S', 'Z', 900);
  const before = pieceWeight(s, 'S');
  for (let i = 0; i < 10; i++) recordAnswer(s, 'S', 'S', 600);
  assert.ok(pieceWeight(s, 'S') < before / 3);
});

test('pickWeighted follows the weights', () => {
  const s = emptyStats();
  for (let i = 0; i < 10; i++) recordAnswer(s, 'Z', 'S', 900);
  const counts = {};
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5000; i++) {
    const id = pickWeighted(s, { rng });
    counts[id] = (counts[id] ?? 0) + 1;
  }
  assert.ok(counts.Z > counts.T * 3, `Z=${counts.Z} T=${counts.T}`);
});

test('load/save survive missing or throwing localStorage', () => {
  delete globalThis.localStorage;
  assert.deepEqual(loadStats(), emptyStats());
  assert.doesNotThrow(() => saveStats(emptyStats()));
  globalThis.localStorage = { getItem: () => '{bad json', setItem: () => { throw new Error('quota'); } };
  assert.deepEqual(loadStats(), emptyStats());
  assert.doesNotThrow(() => saveStats(emptyStats()));
  delete globalThis.localStorage;
});
