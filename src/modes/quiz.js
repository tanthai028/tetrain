// Quiz mode: three question types, random rotations, weighted piece selection,
// instant feedback, keyboard answers (1–7) and an optional 60-second speed round.

import { PIECE_IDS, PIECES } from '../pieces.js';
import { renderPiece, renderSwatch } from '../render.js';
import { recordAnswer, saveStats, pickWeighted } from '../stats.js';
import { h, formatMs, formatPct } from '../dom.js';

export const QUESTION_TYPES = {
  'shape-color': { label: 'Shape → Color', prompt: 'What color?' },
  'color-shape': { label: 'Color → Shape', prompt: 'Which piece?' },
  'shape-name': { label: 'Shape → Name', prompt: 'Which letter?' },
};
const TYPE_ORDER = Object.keys(QUESTION_TYPES);

const CORRECT_PAUSE_MS = 350;
const WRONG_FLASH_MS = 1000;
const SPEED_ROUND_MS = 60_000;

const randomRotation = () => Math.floor(Math.random() * 4);

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createQuizMode(app) {
  let typeFilter = 'mixed';
  let mixedIndex = 0;
  let question = null;
  let shownAt = 0;
  let locked = false;
  let advanceTimer = null;
  let pendingResume = null; // set while the "speed round over" screen is up
  const session = { streak: 0, attempts: 0, correct: 0, totalMs: 0 };
  const speed = { active: false, endsAt: 0, score: 0, timer: null };

  // ---- DOM -------------------------------------------------------------
  const typeSelect = h('select', { class: 'select', 'aria-label': 'Question type' },
    h('option', { value: 'mixed' }, 'Mixed (rotate all 3)'),
    ...TYPE_ORDER.map((t) => h('option', { value: t }, QUESTION_TYPES[t].label)),
  );
  typeSelect.addEventListener('change', () => { typeFilter = typeSelect.value; nextQuestion(); });

  // The speed-round timer lives inside this button so nothing shifts when a round starts.
  const SPEED_LABEL = '⚡ 60s speed round';
  const speedBtn = h('button', { class: 'btn btn--accent speed-btn', type: 'button' }, SPEED_LABEL);
  speedBtn.addEventListener('click', () => (speed.active ? endSpeedRound(true) : startSpeedRound()));

  const stat = (label) => {
    const value = h('span', { class: 'stat__value' }, '–');
    return { value, el: h('div', { class: 'stat' }, value, h('span', { class: 'stat__label' }, label)) };
  };
  const sStreak = stat('Streak');
  const sAcc = stat('Accuracy');
  const sTime = stat('Avg time');
  const sBest = stat('Best streak');
  const scoreboard = h('div', { class: 'scoreboard' }, sStreak.el, sAcc.el, sTime.el, sBest.el);

  const promptText = h('p', { class: 'q-prompt' });
  const stage = h('div', { class: 'q-stage' });
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const options = h('div', { class: 'options' });
  // Speed-round result, overlaid on the question area.
  const roundOver = h('div', { class: 'round-over', hidden: true });

  const el = h('section', { class: 'mode mode-quiz' },
    h('div', { class: 'quiz-toolbar' }, typeSelect, speedBtn),
    scoreboard,
    h('div', { class: 'quiz-play' },
      h('div', { class: 'q-card' }, promptText, stage, feedback),
      options,
      roundOver,
    ),
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
    // Each option is an answer piece id. Shape options get their own random
    // rotation and are shuffled so screen position can't give the answer away.
    const optionIds = type === 'color-shape' ? shuffle(PIECE_IDS) : PIECE_IDS;
    return {
      type,
      target,
      rotation: randomRotation(),
      options: optionIds.map((id) => ({ id, rotation: randomRotation() })),
    };
  }

  function renderPrompt(colored) {
    const { type, target, rotation } = question;
    if (type === 'color-shape') {
      stage.replaceChildren(renderSwatch(target, { cellSize: 'var(--swatch-size)' }));
    } else {
      stage.replaceChildren(renderPiece(target, rotation, { gray: !colored, cellSize: 'var(--prompt-cell)' }));
    }
  }

  function renderOption({ id, rotation }, index, colored = false) {
    let content;
    if (question.type === 'shape-color') {
      content = [renderSwatch(id, { cellSize: 'var(--opt-swatch)' }), h('span', { class: 'opt-label' }, PIECES[id].colorName)];
    } else if (question.type === 'color-shape') {
      content = [h('div', { class: 'opt-piece' }, renderPiece(id, rotation, { gray: !colored, cellSize: 'var(--opt-cell)' }))];
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
    roundOver.hidden = true;
    question = buildQuestion();
    promptText.textContent = QUESTION_TYPES[question.type].prompt;
    feedback.textContent = '';
    feedback.className = 'feedback';
    renderPrompt(false);
    options.className = `options options--${question.type}`;
    options.replaceChildren(...question.options.map((o, i) => renderOption(o, i)));
    shownAt = performance.now();
  }

  function answer(answeredId) {
    if (locked || !question) return;
    if (speed.active && performance.now() >= speed.endsAt) return;
    locked = true;
    const ms = performance.now() - shownAt;
    const { target } = question;
    const correct = answeredId === target;

    recordAnswer(app.stats, target, answeredId, ms);
    session.attempts += 1;
    session.totalMs += ms;
    if (correct) {
      session.correct += 1;
      session.streak += 1;
      if (speed.active) speed.score += 1;
      app.stats.bestStreak = Math.max(app.stats.bestStreak, session.streak);
    } else {
      session.streak = 0;
    }
    saveStats(app.stats);
    updateScoreboard();
    showFeedback(answeredId, correct, ms);

    advanceTimer = setTimeout(nextQuestion, correct ? CORRECT_PAUSE_MS : WRONG_FLASH_MS);
  }

  function showFeedback(answeredId, correct, ms) {
    const { target, type } = question;
    // Reveal the correct answer in color.
    renderPrompt(true);
    question.options.forEach((opt, i) => {
      const btn = options.children[i];
      if (opt.id === target) {
        if (type === 'color-shape') {
          // Color the correct shape so you see which piece wore that color.
          btn.querySelector('.opt-piece').replaceChildren(
            renderPiece(opt.id, opt.rotation, { cellSize: 'var(--opt-cell)' }));
        }
        btn.classList.add('is-correct');
      } else if (opt.id === answeredId) {
        btn.classList.add('is-wrong');
      }
    });

    // The colored prompt and highlighted option already show the answer.
    feedback.className = `feedback ${correct ? 'feedback--ok' : 'feedback--bad'}`;
    feedback.textContent = correct ? `✓ ${formatMs(ms)}` : '✗';
  }

  function updateScoreboard() {
    sStreak.value.textContent = String(session.streak);
    sAcc.value.textContent = formatPct(session.attempts ? session.correct / session.attempts : null);
    sTime.value.textContent = formatMs(session.attempts ? session.totalMs / session.attempts : null);
    sBest.value.textContent = String(app.stats.bestStreak);
  }

  // ---- Speed round -----------------------------------------------------
  function startSpeedRound() {
    speed.active = true;
    speed.score = 0;
    speed.endsAt = performance.now() + SPEED_ROUND_MS;
    speedBtn.classList.add('is-running');
    speedBtn.title = 'Stop speed round';
    tickSpeed();
    speed.timer = setInterval(tickSpeed, 100);
    nextQuestion();
  }

  function tickSpeed() {
    const left = Math.max(0, speed.endsAt - performance.now());
    speedBtn.style.setProperty('--progress', String(left / SPEED_ROUND_MS));
    speedBtn.textContent = `⏱ ${(left / 1000).toFixed(1)}s · ${speed.score} ✓`;
    if (left <= 0) endSpeedRound(false);
  }

  function endSpeedRound(cancelled) {
    clearInterval(speed.timer);
    speed.active = false;
    speedBtn.classList.remove('is-running');
    speedBtn.removeAttribute('title');
    speedBtn.textContent = SPEED_LABEL;
    if (cancelled) return;
    const isBest = speed.score > app.stats.bestSpeedRound;
    if (isBest) {
      app.stats.bestSpeedRound = speed.score;
      saveStats(app.stats);
    }
    clearTimeout(advanceTimer);
    locked = true;
    roundOver.replaceChildren(
      h('div', { class: 'round-over__score' }, String(speed.score)),
      h('div', { class: 'round-over__sub' }, isBest ? '🏆 new best' : `best ${app.stats.bestSpeedRound}`),
      h('button', { class: 'btn btn--accent', type: 'button', onclick: nextQuestion }, 'Continue'),
    );
    roundOver.hidden = false;
    pendingResume = nextQuestion;
  }

  // ---- Keyboard --------------------------------------------------------
  function onKey(e) {
    // Ignore auto-repeat so holding a key can't answer several questions.
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLSelectElement) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > 7) return;
    e.preventDefault();
    if (pendingResume) { pendingResume(); return; }
    const opt = question?.options[n - 1];
    if (opt) answer(opt.id);
  }

  return {
    el,
    onShow() {
      document.addEventListener('keydown', onKey);
      updateScoreboard();
      if (!question || !locked) nextQuestion();
    },
    onHide() {
      document.removeEventListener('keydown', onKey);
      if (speed.active) endSpeedRound(true);
    },
  };
}
