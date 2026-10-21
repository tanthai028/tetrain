// Single source of truth for tetromino colors, names, hints and shapes.
// Every other module imports from here — no piece colors live anywhere else.
//
// Coordinates are [x, y] inside each piece's SRS bounding box (x → right,
// y → down). Rotation states follow SRS order: 0 (spawn), R (clockwise),
// 2 (180°), L (counter-clockwise). Each state is the previous one rotated 90°
// clockwise inside the box, which is exactly how SRS defines them.

export const PIECE_IDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const ROTATION_NAMES = ['0', 'R', '2', 'L'];

// Color for pieces shown "shape only" in quizzes.
export const NEUTRAL_COLOR = '#8A8F98';

export const PIECES = {
  I: {
    id: 'I',
    colorName: 'Cyan',
    hex: '#00F0F0',
    boxSize: 4,
    description: '4 in a row',
    hint: 'I = Cyan: I-ce. The long piece is an icicle.',
    rotations: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
  },
  O: {
    id: 'O',
    colorName: 'Yellow',
    hex: '#F0F000',
    boxSize: 2,
    description: '2×2 square',
    hint: 'O = Yellow: a square sun. Rotating it changes nothing.',
    rotations: [
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
    ],
  },
  T: {
    id: 'T',
    colorName: 'Purple',
    hex: '#A000F0',
    boxSize: 3,
    description: '3 in a row + 1 center bump',
    hint: 'T = Purple: the T is Tetris royalty (T-spins!), and purple is the royal color.',
    rotations: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  S: {
    id: 'S',
    colorName: 'Green',
    hex: '#00F000',
    boxSize: 3,
    description: 'Zigzag, rising to the right',
    hint: 'S = Green: S is for Snake, and snakes are green.',
    rotations: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  Z: {
    id: 'Z',
    colorName: 'Red',
    hex: '#F00000',
    boxSize: 3,
    description: 'Zigzag, rising to the left',
    hint: 'Z = Red: Z is a Zap of red lightning. Green S goes, red Z stops.',
    rotations: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
  },
  J: {
    id: 'J',
    colorName: 'Blue',
    hex: '#0000F0',
    boxSize: 3,
    description: '3 in a row + a hook on the left',
    hint: 'J = Blue: stand it up and the hook curls LEFT, like a J. Think "Blue Jay".',
    rotations: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
  },
  L: {
    id: 'L',
    colorName: 'Orange',
    hex: '#F0A000',
    boxSize: 3,
    description: '3 in a row + a hook on the right',
    hint: 'L = Orange: stand it up and the foot kicks RIGHT, like an L. Orange is the right hook.',
    rotations: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  },
};

// Pairs beginners mix up most. Each entry explains how to tell them apart.
export const CONFUSABLE_PAIRS = [
  {
    ids: ['J', 'L'],
    tip: 'Mirror images. Stand the piece up with the long bar vertical: if the foot points LEFT it is J (blue), if it points RIGHT it is L (orange).',
  },
  {
    ids: ['S', 'Z'],
    tip: 'Mirror images. Lay it flat: if the top row sits to the RIGHT (rising like "/") it is S (green); if the top row sits to the LEFT (falling like "\\") it is Z (red).',
  },
];

export function getPiece(id) {
  const piece = PIECES[id];
  if (!piece) throw new Error(`Unknown piece: ${id}`);
  return piece;
}

// Returns the partner piece id for a confusable piece, or null.
export function confusablePartner(id) {
  const pair = CONFUSABLE_PAIRS.find((p) => p.ids.includes(id));
  if (!pair) return null;
  return pair.ids[0] === id ? pair.ids[1] : pair.ids[0];
}

// Cells for a rotation, as stored (relative to the SRS bounding box).
export function rawCells(id, rotation) {
  return getPiece(id).rotations[mod4(rotation)];
}

// Cells shifted so the piece's own bounding box starts at [0, 0].
// This is what board placement uses: (x, y) = top-left of the piece.
export function normalizedCells(id, rotation) {
  const cells = rawCells(id, rotation);
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

export function mod4(n) {
  return ((n % 4) + 4) % 4;
}
