// Learn mode: all 7 pieces in every rotation at a glance. Each card's mnemonic
// and description show only while you hover it (desktop) or press and hold it
// (touch), overlaid on the card so nothing shifts.

import { PIECE_IDS, PIECES } from '../pieces.js';
import { renderPiece } from '../render.js';
import { h } from '../dom.js';

function pieceCard(id) {
  const piece = PIECES[id];
  const card = h('article', { class: 'reveal-card piece-card', style: `--accent: ${piece.hex}`, tabindex: '0' },
    h('header', { class: 'piece-card__head' },
      h('span', { class: 'piece-letter' }, id),
      h('span', { class: 'piece-color' }, piece.colorName),
    ),
    h('div', { class: 'rotations', 'aria-label': `${id} in all four rotations` },
      [0, 1, 2, 3].map((r) => h('div', { class: 'rotation' },
        renderPiece(id, r, { frame: true, showGrid: true, cellSize: 'var(--learn-cell)' })))),
    h('div', { class: 'reveal' },
      h('span', { class: 'mnemonic' }, piece.mnemonic),
      h('span', { class: 'hint' }, piece.description),
    ),
  );
  // Touch has no hover: show while pressed, hide on release.
  card.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') card.classList.add('is-open'); });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    card.addEventListener(type, () => card.classList.remove('is-open'));
  }
  card.addEventListener('contextmenu', (e) => e.preventDefault()); // suppress long-press menu
  return card;
}

export function createLearnMode() {
  const el = h('section', { class: 'mode mode-learn' },
    h('div', { class: 'piece-grid' }, PIECE_IDS.map(pieceCard)),
  );
  return { el };
}
