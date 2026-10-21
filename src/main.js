// App shell: shared state + tab navigation. Each mode is its own module that
// returns { el, onShow?, onHide? }. To add a mode (e.g. Fill the Gap), create
// src/modes/<name>.js and register it in MODES below.

import { loadStats } from './stats.js';
import { createLearnMode } from './modes/learn.js';
import { createQuizMode } from './modes/quiz.js';
import { createStatsMode } from './modes/stats.js';
import { h } from './dom.js';

const app = { stats: loadStats() };

const MODES = [
  { id: 'learn', label: 'Learn', create: createLearnMode },
  { id: 'quiz', label: 'Quiz', create: createQuizMode },
  { id: 'stats', label: 'Stats', create: createStatsMode },
];

const nav = document.getElementById('nav');
const main = document.getElementById('main');
const instances = {};
let current = null;

for (const mode of MODES) {
  nav.appendChild(h('a', { href: `#${mode.id}`, class: 'tab', 'data-mode': mode.id }, mode.label));
}

function show(id) {
  const mode = MODES.find((m) => m.id === id) ?? MODES[0];
  if (current === mode.id) return;
  if (current) instances[current].onHide?.();
  instances[mode.id] ??= mode.create(app);
  main.replaceChildren(instances[mode.id].el);
  instances[mode.id].onShow?.();
  current = mode.id;
  for (const tab of nav.children) tab.classList.toggle('is-active', tab.dataset.mode === mode.id);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => show(location.hash.slice(1)));
show(location.hash.slice(1) || 'learn');
