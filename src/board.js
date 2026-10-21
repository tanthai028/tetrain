// Grid / board model shared by every mode (and the future "Fill the Gap" mode).
//
// A board is a 2D array indexed board[y][x]. Each cell is:
//   null        → empty
//   'I'..'L'    → filled by that piece (rendered in its color)
//   'G'         → filled, neutral gray (shape-only display, pre-filled terrain)

import { getPiece, normalizedCells, rawCells } from './pieces.js';

export const EMPTY = null;
export const GRAY = 'G';

export function createBoard(width, height, fill = EMPTY) {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function boardWidth(board) {
  return board.length ? board[0].length : 0;
}

export function boardHeight(board) {
  return board.length;
}

// Build a board from strings, e.g. ['..JJ', 'G.GG']. '.' = empty,
// 'G' = gray, any piece letter = that piece. Handy for tests and puzzles.
export function boardFromRows(rows) {
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? EMPTY : ch)));
}

export function boardToRows(board) {
  return board.map((row) => row.map((c) => (c === EMPTY ? '.' : c)).join(''));
}

export function inBounds(board, x, y) {
  return y >= 0 && y < boardHeight(board) && x >= 0 && x < boardWidth(board);
}

// Absolute board cells a piece would occupy with its bounding box's
// top-left corner at (x, y).
export function pieceCellsAt(pieceId, rotation, x, y) {
  return normalizedCells(pieceId, rotation).map(([cx, cy]) => [x + cx, y + cy]);
}

// True when every cell of the piece is on the board and currently empty.
export function canPlace(board, pieceId, rotation, x, y) {
  return pieceCellsAt(pieceId, rotation, x, y).every(
    ([cx, cy]) => inBounds(board, cx, cy) && board[cy][cx] === EMPTY,
  );
}

// Returns a NEW board with the piece placed. Throws if it doesn't fit.
// `value` lets callers place a piece as gray (or any other marker).
export function place(board, pieceId, rotation, x, y, value = pieceId) {
  if (!canPlace(board, pieceId, rotation, x, y)) {
    throw new Error(`Cannot place ${pieceId} (rot ${rotation}) at ${x},${y}`);
  }
  const next = cloneBoard(board);
  for (const [cx, cy] of pieceCellsAt(pieceId, rotation, x, y)) next[cy][cx] = value;
  return next;
}

export function emptyCells(board) {
  const out = [];
  board.forEach((row, y) => row.forEach((c, x) => { if (c === EMPTY) out.push([x, y]); }));
  return out;
}

export function isFull(board) {
  return emptyCells(board).length === 0;
}

// All (rotation, x, y) placements of a piece that currently fit.
// Duplicate shapes (e.g. O's identical rotations) are reported once.
export function legalPlacements(board, pieceId) {
  const seen = new Set();
  const out = [];
  for (let rotation = 0; rotation < 4; rotation++) {
    for (let y = 0; y < boardHeight(board); y++) {
      for (let x = 0; x < boardWidth(board); x++) {
        if (!canPlace(board, pieceId, rotation, x, y)) continue;
        const key = pieceCellsAt(pieceId, rotation, x, y).map((c) => c.join(',')).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ rotation, x, y });
      }
    }
  }
  return out;
}

// A board just big enough to show one piece. `srsBox` keeps the piece in its
// SRS bounding box (so rotating looks like real in-game rotation); otherwise
// the board is trimmed to the piece.
export function boardForPiece(pieceId, rotation, { value = pieceId, srsBox = false } = {}) {
  const cells = srsBox ? rawCells(pieceId, rotation) : normalizedCells(pieceId, rotation);
  const w = srsBox ? getPiece(pieceId).boxSize : Math.max(...cells.map(([x]) => x)) + 1;
  const h = srsBox ? getPiece(pieceId).boxSize : Math.max(...cells.map(([, y]) => y)) + 1;
  const board = createBoard(w, h);
  for (const [x, y] of cells) board[y][x] = value;
  return board;
}
