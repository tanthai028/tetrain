// Quiz mode: two question types, random rotations, weighted piece selection,
// combo popups + sound on streaks, keyboard answers (1–7 or the piece letter)
// and optional 15- or 30-second timed runs whose results show accuracy and speed.

import { PIECE_IDS, PIECES } from '../pieces.js';
import { renderPiece, renderSwatch } from '../render.js';
import { RUN_LENGTHS, recordAnswer, saveStats, pickWeighted } from '../stats.js';
import { playCorrect, playMilestone, playWrong, playStart, playEnd } from '../sfx.js';
import { h, formatMs, formatPct } from '../dom.js';

export const QUESTION_TYPES = {
  'color-shape': { label: 'Color → Shape', prompt: 'Which piece?' },
  'shape-letter': { label: 'Shape → Letter', prompt: 'Which letter?' },
};
const TYPE_ORDER = Object.keys(QUESTION_TYPES);
// Fixed left-to-right order of the answer buttons (and keys 1–7) in every question type.
const ANSWER_ORDER = ['Z', 'S', 'J', 'L', 'O', 'T', 'I'];

const CORRECT_PAUSE_MS = 350;
const WRONG_FLASH_MS = 1000;
const RUN_LENGTH_KEY = 'tetrain:run-length';
const MILESTONE_EVERY = 5;
const BURST_BLOCKS = 12;

const randomRotation = () => Math.floor(Math.random() * 4);

// Restart a CSS animation class on an element.
function replay(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

const emptyRun = () => ({ attempts: 0, correct: 0, totalMs: 0, bestStreak: 0 });

function loadRunLength() {
  try {
    const sec = Number(localStorage.getItem(RUN_LENGTH_KEY));
    return RUN_LENGTHS.includes(sec) ? sec : RUN_LENGTHS.at(-1);
  } catch {
    return RUN_LENGTHS.at(-1);
  }
}

function saveRunLength(sec) {
  try { localStorage.setItem(RUN_LENGTH_KEY, String(sec)); } catch { /* storage unavailable */ }
}

export function createQuizMode(app) {
  let typeFilter = 'mixed';
  let mixedIndex = 0;
  let question = null;
  let shownAt = 0;
  let locked = false;
  let advanceTimer = null;
  let pendingResume = null; // set while the speed-round results are up
  let streak = 0;
  const speed = { active: false, endsAt: 0, timer: null, run: emptyRun(), seconds: loadRunLength() };

  // ---- DOM -------------------------------------------------------------
  // Segmented control: one click to switch question type.
  const typeSeg = h('div', { class: 'segmented type-seg', role: 'radiogroup', 'aria-label': 'Question type' },
    [['mixed', 'Mixed'], ...TYPE_ORDER.map((t) => [t, QUESTION_TYPES[t].label])].map(([value, label]) => {
      const btn = h('button', { type: 'button', role: 'radio', 'data-value': value }, label);
      btn.addEventListener('click', () => { typeFilter = value; drawTypeSeg(); nextQuestion(); });
      return btn;
    }));
  function drawTypeSeg() {
    for (const btn of typeSeg.children) {
      const on = btn.dataset.value === typeFilter;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-checked', String(on));
    }
  }
  drawTypeSeg();

  // Timed run: pick a length, then Start. While running, the Start button
  // shows the countdown (and stops the run), so nothing shifts.
  const lengthSeg = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Timed run length' },
    RUN_LENGTHS.map((sec) => {
      const btn = h('button', { type: 'button', role: 'radio', 'data-value': String(sec) }, `${sec}s`);
      btn.addEventListener('click', () => {
        if (speed.active) return;
        speed.seconds = sec;
        saveRunLength(sec);
        drawLengthSeg();
      });
      return btn;
    }));
  function drawLengthSeg() {
    for (const btn of lengthSeg.children) {
      const on = Number(btn.dataset.value) === speed.seconds;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-checked', String(on));
      btn.disabled = speed.active && !on;
    }
  }
  drawLengthSeg();

  const START_LABEL = '▶ Start timed run';
  const speedBtn = h('button', { class: 'btn btn--accent speed-btn', type: 'button' }, START_LABEL);
  speedBtn.addEventListener('click', () => (speed.active ? endSpeedRound(true) : startSpeedRound()));
  const timedGroup = h('div', { class: 'timed-group' }, lengthSeg, speedBtn);

  const promptText = h('p', { class: 'q-prompt' });
  const stage = h('div', { class: 'q-stage' });
  const card = h('div', { class: 'q-card' }, promptText, stage);
  const options = h('div', { class: 'options' });
  // Popups and bursts are drawn on this layer, on top of everything.
  const fx = h('div', { class: 'fx-layer', 'aria-hidden': 'true' });
  // Timed-run results, overlaid on (and blurring) the whole quiz, toolbar included.
  const results = h('div', { class: 'results', hidden: true });

  const el = h('section', { class: 'mode mode-quiz' },
    h('div', { class: 'quiz-toolbar' }, typeSeg, timedGroup),
    h('div', { class: 'quiz-play' }, card, options, fx),
    results,
  );

  // ---- Question flow ---------------------------------------------------
  function nextType() {
    if (typeFilter !== 'mixed') return typeFilter;
    const t = TYPE_ORDER[mixedIndex % TYPE_ORDER.length];
    mixedIndex += 1;
    return t;
  }

  function buildQuestion() {
    const type = nextType();
    const target = pickWeighted(app.stats, { avoid: question?.target });
    // Each option is an answer piece id, always in ANSWER_ORDER. Shape
    // options get their own random rotation every question.
    return {
      type,
      target,
      rotation: randomRotation(),
      options: ANSWER_ORDER.map((id) => ({ id, rotation: randomRotation() })),
    };
  }

  function renderPrompt() {
    const { type, target, rotation } = question;
    if (type === 'color-shape') {
      stage.replaceChildren(renderSwatch(target, { cellSize: 'var(--swatch-size)' }));
    } else {
      stage.replaceChildren(renderPiece(target, rotation, { cellSize: 'var(--prompt-cell)' }));
    }
  }

  function renderOption({ id, rotation }, index) {
    let content;
    if (question.type === 'color-shape') {
      content = [h('div', { class: 'opt-piece' }, renderPiece(id, rotation, { gray: true, cellSize: 'var(--opt-cell)' }))];
    } else {
      content = [h('span', { class: 'opt-letter' }, id)];
    }
    const btn = h('button', { class: 'option', type: 'button', 'data-id': id },
      h('kbd', { class: 'opt-key' }, String(index + 1)), ...content);
    btn.addEventListener('click', () => answer(id));
    return btn;
  }

  function nextQuestion() {
    clearTimeout(advanceTimer);
    locked = false;
    pendingResume = null;
    results.hidden = true;
    question = buildQuestion();
    promptText.textContent = QUESTION_TYPES[question.type].prompt;
    renderPrompt();
    options.className = `options options--${question.type}`;
    options.replaceChildren(...question.options.map((o, i) => renderOption(o, i)));
    shownAt = performance.now();
  }

  function answer(answeredId) {
    if (locked || !question) return;
    if (speed.active && performance.now() >= speed.endsAt) return;
    locked = true;
    const ms = performance.now() - shownAt;
    const correct = answeredId === question.target;

    recordAnswer(app.stats, question.target, answeredId, ms);
    streak = correct ? streak + 1 : 0;
    if (speed.active) {
      const { run } = speed;
      run.attempts += 1;
      run.totalMs += ms;
      if (correct) run.correct += 1;
      run.bestStreak = Math.max(run.bestStreak, streak);
    }
    saveStats(app.stats);

    revealAnswer(answeredId);
    if (correct) celebrate();
    else {
      playWrong();
      replay(card, 'is-shaking');
    }
    advanceTimer = setTimeout(nextQuestion, correct ? CORRECT_PAUSE_MS : WRONG_FLASH_MS);
  }

  // Show the correct answer in color and mark the picked one.
  function revealAnswer(answeredId) {
    const { target, type } = question;
    renderPrompt();
    replay(stage, 'is-popping');
    question.options.forEach((opt, i) => {
      const btn = options.children[i];
      if (opt.id === target) {
        if (type === 'color-shape') {
          btn.querySelector('.opt-piece').replaceChildren(
            renderPiece(opt.id, opt.rotation, { cellSize: 'var(--opt-cell)' }));
        }
        btn.classList.add('is-correct');
      } else if (opt.id === answeredId) {
        btn.classList.add('is-wrong');
      }
    });
  }

  // ---- Effects ---------------------------------------------------------
  function celebrate() {
    const milestone = streak % MILESTONE_EVERY === 0;
    playCorrect(streak);
    if (milestone) playMilestone(streak);
    if (streak >= 2) showCombo(milestone);
    if (milestone) burst();
  }

  // tetr.io-style "N COMBO" popup in the answered piece's color.
  function showCombo(milestone) {
    fx.querySelector('.combo')?.remove();
    const size = Math.min(1 + (streak - 2) * 0.06, 1.8);
    const popup = h('div', {
      class: `combo${milestone ? ' combo--big' : ''}`,
      style: `--accent: ${PIECES[question.target].hex}; --size: ${size}`,
    }, h('span', { class: 'combo__n' }, String(streak)), h('span', { class: 'combo__label' }, 'COMBO'));
    popup.addEventListener('animationend', () => popup.remove());
    fx.appendChild(popup);
  }

  // Blocks in the piece's color fly out from the prompt.
  function burst() {
    const box = stage.getBoundingClientRect();
    const host = fx.getBoundingClientRect();
    const cx = box.left + box.width / 2 - host.left;
    const cy = box.top + box.height / 2 - host.top;
    for (let i = 0; i < BURST_BLOCKS; i++) {
      const angle = (i / BURST_BLOCKS) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 90;
      const block = h('div', {
        class: 'burst-block cell cell--filled',
        style: `--c: ${PIECES[question.target].hex}; left: ${cx}px; top: ${cy}px;`
          + ` --dx: ${Math.cos(angle) * dist}px; --dy: ${Math.sin(angle) * dist}px; --spin: ${Math.round(Math.random() * 360 - 180)}deg`,
      });
      block.addEventListener('animationend', () => block.remove());
      fx.appendChild(block);
    }
  }

  // ---- Speed round -----------------------------------------------------
  function startSpeedRound() {
    speed.active = true;
    speed.run = emptyRun();
    speed.endsAt = performance.now() + speed.seconds * 1000;
    streak = 0;
    speedBtn.classList.add('is-running');
    speedBtn.title = 'Stop timed run';
    drawLengthSeg();
    playStart();
    tickSpeed();
    speed.timer = setInterval(tickSpeed, 100);
    // Keep the question that's on screen; its answer time starts with the run.
    // (If an answer is mid-feedback, the pending advance brings the next one.)
    if (!locked) shownAt = performance.now();
  }

  function tickSpeed() {
    const left = Math.max(0, speed.endsAt - performance.now());
    speedBtn.style.setProperty('--progress', String(left / (speed.seconds * 1000)));
    speedBtn.textContent = `■ ${(left / 1000).toFixed(1)}s · ${speed.run.correct} ✓`;
    if (left <= 0) endSpeedRound(false);
  }

  function endSpeedRound(cancelled) {
    clearInterval(speed.timer);
    speed.active = false;
    speedBtn.classList.remove('is-running');
    speedBtn.removeAttribute('title');
    speedBtn.textContent = START_LABEL;
    drawLengthSeg();
    if (cancelled) return;

    const { run } = speed;
    const prevBest = app.stats.bestRuns[speed.seconds] ?? 0;
    const isBest = run.correct > prevBest;
    app.stats.bestRuns[speed.seconds] = Math.max(prevBest, run.correct);
    app.stats.bestStreak = Math.max(app.stats.bestStreak, run.bestStreak);
    saveStats(app.stats);
    clearTimeout(advanceTimer);
    locked = true;
    playEnd(isBest);

    const tile = (value, label) => h('div', { class: 'stat' },
      h('span', { class: 'stat__value' }, value), h('span', { class: 'stat__label' }, label));
    results.replaceChildren(
      h('div', { class: 'results__score' }, String(run.correct)),
      h('div', { class: 'results__sub' },
        `${speed.seconds}s · ${isBest ? '🏆 new best' : `best ${app.stats.bestRuns[speed.seconds]}`}`),
      h('div', { class: 'results__stats' },
        tile(formatPct(run.attempts ? run.correct / run.attempts : null), 'Accuracy'),
        tile(formatMs(run.attempts ? run.totalMs / run.attempts : null), 'Avg time'),
        tile(String(run.bestStreak), 'Best streak'),
      ),
      h('button', { class: 'btn btn--accent', type: 'button', onclick: nextQuestion }, 'Continue'),
    );
    results.hidden = false;
    pendingResume = nextQuestion;
  }

  // ---- Keyboard --------------------------------------------------------
  // 1–7 picks by position; I O T S Z J L picks that piece directly.
  function onKey(e) {
    // Ignore auto-repeat so holding a key can't answer several questions.
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toUpperCase();
    const n = Number(key);
    let id = null;
    if (Number.isInteger(n) && n >= 1 && n <= 7) id = question?.options[n - 1]?.id;
    else if (PIECE_IDS.includes(key)) id = key;
    else return;
    e.preventDefault();
    if (pendingResume) { pendingResume(); return; }
    if (id) answer(id);
  }

  return {
    el,
    onShow() {
      document.addEventListener('keydown', onKey);
      if (!question || !locked) nextQuestion();
    },
    onHide() {
      document.removeEventListener('keydown', onKey);
      if (speed.active) endSpeedRound(true);
    },
  };
}
