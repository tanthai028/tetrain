// Stats mode: per-piece table of attempts, accuracy and average time.

import { PIECE_IDS, PIECES } from '../pieces.js';
import { renderPiece } from '../render.js';
import { accuracy, averageMs, totals, resetStats } from '../stats.js';
import { h, formatMs, formatPct } from '../dom.js';

export function createStatsMode(app) {
  const body = h('div');
  const el = h('section', { class: 'mode mode-stats' }, body);

  function draw() {
    const { stats } = app;
    const all = totals(stats);

    const rows = PIECE_IDS.map((id) => {
      const s = stats.pieces[id];
      const acc = accuracy(s);
      return h('tr', {},
        h('td', { class: 'cell-piece' },
          renderPiece(id, 0, { cellSize: '10px' }),
          h('span', {}, h('strong', {}, id), ` ${PIECES[id].colorName}`)),
        h('td', { class: 'num' }, String(s.attempts)),
        h('td', { class: 'acc-cell' },
          h('div', { class: 'bar' }, h('span', { style: `width: ${Math.round((acc ?? 0) * 100)}%` })),
          h('span', { class: `num ${acc != null && acc < 0.7 ? 'is-weak' : ''}` }, formatPct(acc))),
        h('td', { class: 'num' }, formatMs(averageMs(s))),
      );
    });

    const resetBtn = h('button', { class: 'btn btn--ghost', type: 'button' }, 'Reset stats');
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all saved quiz stats?')) return;
      app.stats = resetStats();
      draw();
    });

    body.replaceChildren(
      h('div', { class: 'scoreboard' },
        h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, String(all.attempts)), h('span', { class: 'stat__label' }, 'Answers')),
        h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, formatPct(all.attempts ? all.correct / all.attempts : null)), h('span', { class: 'stat__label' }, 'Accuracy')),
        h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, formatMs(all.attempts ? all.totalMs / all.attempts : null)), h('span', { class: 'stat__label' }, 'Avg time')),
        h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, String(stats.bestSpeedRound)), h('span', { class: 'stat__label' }, 'Best 60s round')),
      ),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'stats-table' },
          h('thead', {}, h('tr', {},
            h('th', {}, 'Piece'), h('th', { class: 'num' }, 'Attempts'), h('th', {}, 'Accuracy'),
            h('th', { class: 'num' }, 'Avg time'))),
          h('tbody', {}, ...rows),
        ),
      ),
      resetBtn,
    );
  }

  return { el, onShow: draw };
}
