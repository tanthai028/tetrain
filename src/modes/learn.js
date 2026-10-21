// Learn mode: all 7 pieces with color, name, rotation controls and memory hints,
// plus a callout for the confusable pairs (J/L, S/Z).

import { PIECE_IDS, PIECES, CONFUSABLE_PAIRS, ROTATION_NAMES, mod4 } from '../pieces.js';
import { renderPiece } from '../render.js';
import { h } from '../dom.js';

const AUTO_ROTATE_MS = 650;

// Orientation that makes each confusable piece look most like its letter.
const LETTER_POSE = { J: 3, L: 1, S: 0, Z: 0 };

function pieceCard(id) {
  const piece = PIECES[id];
  let rotation = 0;
  let timer = null;

  const stage = h('div', { class: 'learn-stage' });
  const rotLabel = h('span', { class: 'rot-label' });
  const strip = h('div', { class: 'rot-strip', 'aria-label': 'All four rotations' });

  function draw() {
    stage.replaceChildren(renderPiece(id, rotation, { srsBox: true, cellSize: 'var(--learn-cell)' }));
    rotLabel.textContent = `Rotation ${ROTATION_NAMES[rotation]}`;
    [...strip.children].forEach((el, i) => el.classList.toggle('is-active', i === rotation));
  }

  ROTATION_NAMES.forEach((name, i) => {
    const btn = h('button', { class: 'rot-thumb', type: 'button', title: `Rotation ${name}` },
      renderPiece(id, i, { srsBox: true, cellSize: '9px' }));
    btn.addEventListener('click', () => { rotation = i; draw(); });
    strip.appendChild(btn);
  });

  const rotateBtn = h('button', { class: 'btn', type: 'button' }, '↻ Rotate');
  rotateBtn.addEventListener('click', () => { rotation = mod4(rotation + 1); draw(); });

  const card = h('article', { class: 'piece-card', style: `--accent: ${piece.hex}` },
    h('header', { class: 'piece-card__head' },
      h('span', { class: 'piece-letter' }, id),
      h('span', { class: 'piece-color' }, piece.colorName),
    ),
    stage,
    h('div', { class: 'piece-card__controls' }, rotateBtn, rotLabel),
    strip,
    h('p', { class: 'piece-desc' }, piece.description),
    h('p', { class: 'hint' }, piece.hint),
  );

  // Auto-rotate while hovering (desktop); tap the button on touch devices.
  card.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || timer) return;
    timer = setInterval(() => { rotation = mod4(rotation + 1); draw(); }, AUTO_ROTATE_MS);
  });
  card.addEventListener('pointerleave', () => { clearInterval(timer); timer = null; });

  draw();
  return card;
}

function confusableCallout(pair) {
  const [a, b] = pair.ids;
  const side = (id) => h('div', { class: 'pair-side' },
    renderPiece(id, LETTER_POSE[id], { cellSize: '22px' }),
    h('div', { class: 'pair-label' }, h('strong', {}, id), ` = ${PIECES[id].colorName}`),
  );
  return h('div', { class: 'pair' },
    h('h3', {}, `${a} vs ${b}: ${PIECES[a].colorName.toLowerCase()} vs ${PIECES[b].colorName.toLowerCase()}`),
    h('div', { class: 'pair-pieces' }, side(a), h('span', { class: 'pair-vs' }, 'vs'), side(b)),
    h('p', { class: 'hint' }, pair.tip),
  );
}

export function createLearnMode() {
  const el = h('section', { class: 'mode mode-learn' },
    h('h2', {}, 'Learn the pieces'),
    h('p', { class: 'lede' }, 'Each piece always has the same color. Rotate them (or hover) to see every orientation.'),
    h('div', { class: 'piece-grid' }, ...PIECE_IDS.map(pieceCard)),
    h('h2', {}, 'Watch out: the mirror pairs'),
    h('p', { class: 'lede' }, 'Beginners mix these up the most. They are mirror images with different colors.'),
    h('div', { class: 'pairs' }, ...CONFUSABLE_PAIRS.map(confusableCallout)),
  );
  return { el };
}
