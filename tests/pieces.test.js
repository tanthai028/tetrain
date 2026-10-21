import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, PIECE_IDS, CONFUSABLE_PAIRS, normalizedCells } from '../src/pieces.js';

const key = (cells) => cells.map(([x, y]) => `${x},${y}`).sort().join(' ');
const rotateCW = (cells, n) => cells.map(([x, y]) => [n - 1 - y, x]);
const mirror = (cells) => {
  const maxX = Math.max(...cells.map(([x]) => x));
  return cells.map(([x, y]) => [maxX - x, y]);
};

test('exactly the 7 guideline pieces with guideline colors', () => {
  assert.deepEqual(PIECE_IDS, ['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
  const expected = {
    I: ['Cyan', '#00F0F0'], O: ['Yellow', '#F0F000'], T: ['Purple', '#A000F0'],
    S: ['Green', '#00F000'], Z: ['Red', '#F00000'], J: ['Blue', '#0000F0'], L: ['Orange', '#F0A000'],
  };
  for (const id of PIECE_IDS) {
    assert.equal(PIECES[id].id, id);
    assert.deepEqual([PIECES[id].colorName, PIECES[id].hex], expected[id], id);
  }
});

for (const id of PIECE_IDS) {
  test(`${id}: 4 rotations, each with exactly 4 distinct in-box cells`, () => {
    const { rotations, boxSize } = PIECES[id];
    assert.equal(rotations.length, 4);
    rotations.forEach((cells, r) => {
      assert.equal(cells.length, 4, `${id} rotation ${r} cell count`);
      assert.equal(new Set(cells.map(String)).size, 4, `${id} rotation ${r} has duplicate cells`);
      for (const [x, y] of cells) {
        assert.ok(x >= 0 && x < boxSize && y >= 0 && y < boxSize, `${id} r${r} cell ${x},${y} outside box`);
      }
    });
  });

  test(`${id}: each SRS state is the previous one rotated clockwise`, () => {
    const { rotations, boxSize } = PIECES[id];
    for (let r = 0; r < 4; r++) {
      assert.equal(key(rotateCW(rotations[r], boxSize)), key(rotations[(r + 1) % 4]), `${id} ${r}→${(r + 1) % 4}`);
    }
  });

  test(`${id}: cells are 4-connected`, () => {
    for (const cells of PIECES[id].rotations) {
      const set = new Set(cells.map(String));
      const seen = new Set([String(cells[0])]);
      const stack = [cells[0]];
      while (stack.length) {
        const [x, y] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${x + dx},${y + dy}`;
          if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
        }
      }
      assert.equal(seen.size, 4);
    }
  });
}

test('spawn shapes match the guideline descriptions', () => {
  const spawn = (id) => key(normalizedCells(id, 0));
  assert.equal(spawn('I'), key([[0, 0], [1, 0], [2, 0], [3, 0]]));
  assert.equal(spawn('O'), key([[0, 0], [1, 0], [0, 1], [1, 1]]));
  assert.equal(spawn('T'), key([[1, 0], [0, 1], [1, 1], [2, 1]]));
  assert.equal(spawn('S'), key([[1, 0], [2, 0], [0, 1], [1, 1]])); // rises to the right
  assert.equal(spawn('Z'), key([[0, 0], [1, 0], [1, 1], [2, 1]])); // rises to the left
  assert.equal(spawn('J'), key([[0, 0], [0, 1], [1, 1], [2, 1]])); // corner on the left
  assert.equal(spawn('L'), key([[2, 0], [0, 1], [1, 1], [2, 1]])); // corner on the right
});

test('no two pieces share a shape in any rotation', () => {
  const owner = new Map();
  for (const id of PIECE_IDS) {
    for (let r = 0; r < 4; r++) {
      const k = key(normalizedCells(id, r));
      if (owner.has(k)) assert.equal(owner.get(k), id, `${id} r${r} duplicates ${owner.get(k)}`);
      owner.set(k, id);
    }
  }
});

test('confusable pairs are mirror images of each other', () => {
  for (const { ids: [a, b] } of CONFUSABLE_PAIRS) {
    assert.equal(key(mirror(normalizedCells(a, 0))), key(normalizedCells(b, 0)), `${a}/${b}`);
  }
});
