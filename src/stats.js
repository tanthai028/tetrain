// Per-piece quiz stats, persisted in localStorage, plus the weighting used to
// pick weaker pieces more often (simple spaced repetition).
//
// Every quiz question is "about" one piece (the target) and every answer maps
// back to a piece id, so all three question types share one record shape:
//   { attempts, correct, totalMs, wrong: { [answeredId]: count }, recent: [answeredId, ...] }

import { PIECE_IDS, confusablePartner } from './pieces.js';

const STORAGE_KEY = 'tetrain:stats:v1';
const RECENT_WINDOW = 10;

// Timed-run lengths in seconds; each keeps its own best in stats.bestRuns.
export const RUN_LENGTHS = [15, 30];

function emptyPieceStats() {
  return { attempts: 0, correct: 0, totalMs: 0, wrong: {}, recent: [] };
}

export function emptyStats() {
  const pieces = {};
  for (const id of PIECE_IDS) pieces[id] = emptyPieceStats();
  // bestRuns: best correct answers per timed-run length in seconds, e.g. { 15: 8, 30: 14 }.
  return { pieces, bestStreak: 0, bestRuns: {} };
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw);
    const stats = emptyStats();
    for (const id of PIECE_IDS) Object.assign(stats.pieces[id], parsed.pieces?.[id]);
    stats.bestStreak = parsed.bestStreak ?? 0;
    stats.bestRuns = { ...parsed.bestRuns };
    // Older saves only had a 60-second best.
    if (parsed.bestSpeedRound && !stats.bestRuns[60]) stats.bestRuns[60] = parsed.bestSpeedRound;
    return stats;
  } catch {
    return emptyStats();
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable (private mode, quota, blocked) — stats stay in memory.
  }
}

export function resetStats() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return emptyStats();
}

// Mutates and returns stats.
export function recordAnswer(stats, targetId, answeredId, ms) {
  const s = stats.pieces[targetId];
  s.attempts += 1;
  s.totalMs += ms;
  if (answeredId === targetId) s.correct += 1;
  else s.wrong[answeredId] = (s.wrong[answeredId] ?? 0) + 1;
  s.recent = [...s.recent, answeredId].slice(-RECENT_WINDOW);
  return stats;
}

export function accuracy(s) {
  return s.attempts ? s.correct / s.attempts : null;
}

export function averageMs(s) {
  return s.attempts ? s.totalMs / s.attempts : null;
}

export function mostCommonWrong(s) {
  let best = null;
  for (const [id, count] of Object.entries(s.wrong)) {
    if (!best || count > best.count) best = { id, count };
  }
  return best;
}

export function totals(stats) {
  let attempts = 0, correct = 0, totalMs = 0;
  for (const id of PIECE_IDS) {
    const s = stats.pieces[id];
    attempts += s.attempts; correct += s.correct; totalMs += s.totalMs;
  }
  return { attempts, correct, totalMs };
}

// Higher weight = asked more often. Based on the recent window so a piece
// stops being drilled once you've actually improved on it.
export function pieceWeight(stats, id) {
  const { recent } = stats.pieces[id];
  // Smoothed recent accuracy: unseen pieces start at 50%.
  const hits = recent.filter((a) => a === id).length;
  const acc = (hits + 1) / (recent.length + 2);
  let weight = 0.5 + 4 * (1 - acc);
  // Extra push for J/L and S/Z when you've recently mixed up the pair.
  const partner = confusablePartner(id);
  if (partner) {
    weight += 1.5 * recent.filter((a) => a === partner).length;
    // ...and for the partner itself: answering "L" for a J means L is shaky too.
    weight += 0.75 * stats.pieces[partner].recent.filter((a) => a === id).length;
  }
  return weight;
}

export function pickWeighted(stats, { avoid = null, rng = Math.random } = {}) {
  const entries = PIECE_IDS.map((id) => [id, pieceWeight(stats, id) * (id === avoid ? 0.25 : 1)]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r < 0) return id;
  }
  return entries[entries.length - 1][0];
}
