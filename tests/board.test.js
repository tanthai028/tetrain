import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBoard, boardFromRows, boardToRows, canPlace, place, isFull, emptyCells,
  legalPlacements, boardForPiece, GRAY,
} from '../src/board.js';

test('createBoard makes an empty height×width grid', () => {
  const b = createBoard(4, 3);
  assert.equal(b.length, 3);
  assert.equal(b[0].length, 4);
  assert.equal(emptyCells(b).length, 12);
});

test('canPlace respects bounds and occupied cells', () => {
  const b = boardFromRows(['....', '....']);
  assert.ok(canPlace(b, 'I', 0, 0, 0));
  assert.ok(!canPlace(b, 'I', 0, 1, 0), 'runs off the right edge');
  assert.ok(!canPlace(b, 'I', 1, 0, 0), 'vertical I is too tall');
  assert.ok(!canPlace(b, 'O', 0, -1, 0), 'negative x');
  const blocked = boardFromRows(['..G.', '....']);
  assert.ok(!canPlace(blocked, 'I', 0, 0, 0), 'overlaps a filled cell');
  assert.ok(canPlace(blocked, 'I', 0, 0, 1));
});

test('place returns a new board and does not mutate the input', () => {
  const b = createBoard(4, 2);
  const next = place(b, 'J', 0, 0, 0);
  assert.deepEqual(boardToRows(next), ['J...', 'JJJ.']);
  assert.deepEqual(boardToRows(b), ['....', '....']);
  assert.throws(() => place(next, 'O', 0, 0, 0));
});

test('place can mark cells gray', () => {
  const next = place(createBoard(2, 2), 'O', 0, 0, 0, GRAY);
  assert.deepEqual(boardToRows(next), ['GG', 'GG']);
});

test('different piece combinations fill the same 4×2 rectangle (Fill the Gap readiness)', () => {
  // J + J
  let a = place(createBoard(4, 2), 'J', 0, 0, 0);
  a = place(a, 'J', 2, 1, 0);
  assert.ok(isFull(a));
  // L + L
  let l = place(createBoard(4, 2), 'L', 2, 0, 0);
  l = place(l, 'L', 0, 1, 0);
  assert.deepEqual(boardToRows(l), ['LLLL', 'LLLL']);
  // O + O
  let b = place(createBoard(4, 2), 'O', 0, 0, 0);
  b = place(b, 'O', 0, 2, 0);
  assert.ok(isFull(b));
  // I + I
  let c = place(createBoard(4, 2), 'I', 0, 0, 0);
  c = place(c, 'I', 2, 0, 1);
  assert.ok(isFull(c));
});

test('legalPlacements de-duplicates identical shapes', () => {
  assert.equal(legalPlacements(createBoard(2, 2), 'O').length, 1);
  assert.equal(legalPlacements(createBoard(4, 1), 'I').length, 1);
  assert.equal(legalPlacements(createBoard(4, 4), 'I').length, 8);
});

test('boardForPiece trims by default and keeps the SRS box when asked', () => {
  assert.deepEqual(boardToRows(boardForPiece('T', 0)), ['.T.', 'TTT']);
  assert.deepEqual(boardToRows(boardForPiece('I', 1, { srsBox: true })), ['..I.', '..I.', '..I.', '..I.']);
});
