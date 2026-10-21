// Learn mode: all 7 pieces in every rotation at a glance. Memory hints and the
// mirror-pair tips stay hidden until you hover (desktop) or tap a card.

import { PIECE_IDS, PIECES, CONFUSABLE_PAIRS } from '../pieces.js';
import { renderPiece } from '../render.js';
import { h } from '../dom.js';

// Orientation that makes each confusable piece look most like its letter.
const LETTER_POSE = { J: 3, L: 1, S: 0, Z: 0 };

// A card that reveals its `.reveal` content on hover, focus or tap.
function revealCard(className, style, ...children) {
  const card = h('article', { class: `reveal-card ${className}`, style, tabindex: '0' }, ...children);
  card.addEventListener('click', () => card.classList.toggle('is-open'));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('is-open'); }
  });
  return card;
}

function pieceCard(id) {
  const piece = PIECES[id];
  return revealCard('piece-card', `--accent: ${piece.hex}`,
    h('header', { class: 'piece-card__head' },
      h('span', { class: 'piece-letter' }, id),
      h('span', { class: 'piece-color' }, piece.colorName),
    ),
    h('div', { class: 'rotations', 'aria-label': `${id} in all four rotations` },
      [0, 1, 2, 3].map((r) => h('div', { class: 'rotation' },
        renderPiece(id, r, { srsBox: true, cellSize: 'var(--learn-cell)' })))),
    h('p', { class: 'reveal hint' }, piece.hint),
  );
}

function pairCard({ ids: [a, b], tip }) {
  const side = (id) => h('div', { class: 'pair-side' },
    renderPiece(id, LETTER_POSE[id], { cellSize: '22px' }),
    h('span', { class: 'pair-label', style: `--accent: ${PIECES[id].hex}` }, id),
  );
  return revealCard('pair', null,
    h('div', { class: 'pair-pieces' }, side(a), h('span', { class: 'pair-vs' }, 'vs'), side(b)),
    h('p', { class: 'reveal hint' }, tip),
  );
}

export function createLearnMode() {
  const el = h('section', { class: 'mode mode-learn' },
    h('div', { class: 'piece-grid' }, PIECE_IDS.map(pieceCard)),
    h('h2', {}, 'Mirror pairs'),
    h('div', { class: 'pairs' }, CONFUSABLE_PAIRS.map(pairCard)),
  );
  return { el };
}
