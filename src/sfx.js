// Synthesized sound effects (Web Audio): no audio files to load. Correct
// answers climb in pitch as a combo grows, like line-clear combos in tetr.io.

const MUTE_KEY = 'tetrain:muted';
const BASE_HZ = 523.25; // C5
const MAX_STEP = 15; // stop climbing after this many combo steps

let ctx = null;
let muted = loadMuted();

function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* storage unavailable */ }
}

// Created lazily: browsers only allow audio after a user gesture.
function audio() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(ac, { freq, to = freq, type = 'triangle', at = 0, dur = 0.1, vol = 0.15 }) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const semitones = (n) => BASE_HZ * 2 ** (n / 12);

// combo = current streak (1 for the first correct answer).
export function playCorrect(combo) {
  const ac = audio();
  if (!ac) return;
  const f = semitones(Math.min(combo - 1, MAX_STEP));
  tone(ac, { freq: f, type: 'triangle', dur: 0.12, vol: 0.2 });
  tone(ac, { freq: f * 2, type: 'square', dur: 0.06, vol: 0.03 });
}

// Every 5 in a row: a quick rising arpeggio.
export function playMilestone(combo) {
  const ac = audio();
  if (!ac) return;
  const root = Math.min(combo - 1, MAX_STEP);
  [0, 4, 7, 12].forEach((n, i) => {
    tone(ac, { freq: semitones(root + n), type: 'square', at: 0.09 + i * 0.055, dur: 0.12, vol: 0.06 });
  });
}

export function playWrong() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: 196, to: 98, type: 'sawtooth', dur: 0.24, vol: 0.09 });
}

export function playStart() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: semitones(0), dur: 0.08, vol: 0.15 });
  tone(ac, { freq: semitones(7), at: 0.1, dur: 0.12, vol: 0.15 });
}

export function playEnd(newBest) {
  const ac = audio();
  if (!ac) return;
  const notes = newBest ? [0, 4, 7, 12, 16, 19, 24] : [7, 4, 0];
  notes.forEach((n, i) => tone(ac, { freq: semitones(n), type: 'square', at: i * 0.07, dur: 0.16, vol: 0.07 }));
}
