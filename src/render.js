// DOM renderer for any board state. Pieces, swatches and (later) Fill the Gap
// puzzles are all drawn through renderBoard — never as images.

import { PIECES, NEUTRAL_COLOR } from './pieces.js';
import { GRAY, boardForPiece, boardWidth, boardHeight } from './board.js';

export function colorFor(value) {
  if (value === GRAY) return NEUTRAL_COLOR;
  return PIECES[value]?.hex ?? null;
}

// Options:
//   cellSize  – CSS length per cell (default '28px')
//   showGrid  – draw faint outlines for empty cells (default false)
//   className – extra class for the wrapper
export function renderBoard(board, { cellSize = '28px', showGrid = false, className = '' } = {}) {
  const el = document.createElement('div');
  el.className = `board ${showGrid ? 'board--grid' : ''} ${className}`.trim();
  el.style.setProperty('--cell', cellSize);
  el.style.gridTemplateColumns = `repeat(${boardWidth(board)}, var(--cell))`;
  el.style.gridTemplateRows = `repeat(${boardHeight(board)}, var(--cell))`;
  for (const row of board) {
    for (const value of row) {
      const cell = document.createElement('div');
      const color = colorFor(value);
      if (color) {
        cell.className = 'cell cell--filled';
        cell.style.setProperty('--c', color);
      } else {
        cell.className = 'cell';
      }
      el.appendChild(cell);
    }
  }
  return el;
}

// Options: gray (draw in neutral gray), srsBox (keep SRS bounding box), cellSize.
export function renderPiece(pieceId, rotation, { gray = false, srsBox = false, ...opts } = {}) {
  const board = boardForPiece(pieceId, rotation, { value: gray ? GRAY : pieceId, srsBox });
  const el = renderBoard(board, opts);
  el.dataset.piece = pieceId;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', gray ? 'Tetromino shape' : `${pieceId} piece, ${PIECES[pieceId].colorName}`);
  return el;
}

// A single big beveled block in a piece's color.
export function renderSwatch(pieceId, { cellSize = '56px' } = {}) {
  const el = renderBoard([[pieceId]], { cellSize, className: 'swatch' });
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', PIECES[pieceId].colorName);
  return el;
}
