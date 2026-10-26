// Single source of truth for tetromino colors, names, mnemonics, descriptions and shapes.
// Every other module imports from here — no piece colors live anywhere else.
//
// Coordinates are [x, y] inside each piece's SRS bounding box (x → right,
// y → down). Rotation states follow SRS order: 0 (spawn), R (clockwise),
// 2 (180°), L (counter-clockwise). Each state is the previous one rotated 90°
// clockwise inside the box, which is exactly how SRS defines them.

export const PIECE_IDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const ROTATION_NAMES = ['0', 'R', '2', 'L'];

// Every piece fits a 4×4 spawn frame. Each piece's SRS box sits in it at
// `frameOffset`, which reproduces in-game spawn alignment: the 3-wide pieces
// use the left 3 columns, I fills the frame, and O sits in the middle columns.
export const SPAWN_FRAME_SIZE = 4;

// Color for pieces shown "shape only" in quizzes.
export const NEUTRAL_COLOR = '#8A8F98';

export const PIECES = {
  I: {
    id: 'I',
    colorName: 'Cyan',
    hex: '#00F0F0',
    boxSize: 4,
    frameOffset: [0, 0],
    description: '4 in a row',
    mnemonic: 'icicle',
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
    frameOffset: [1, 0],
    description: '2×2 square',
    mnemonic: 'omelet',
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
    frameOffset: [0, 0],
    description: '3 in a row, bump in the middle',
    mnemonic: 'thanos',
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
    frameOffset: [0, 0],
    description: 'Zigzag, rises to the right',
    mnemonic: 'spinach',
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
    frameOffset: [0, 0],
    description: 'Zigzag, rises to the left',
    mnemonic: 'zit',
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
    frameOffset: [0, 0],
    description: '3 in a row, corner on the left',
    mnemonic: 'jeans',
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
    frameOffset: [0, 0],
    description: '3 in a row, corner on the right',
    mnemonic: 'lava',
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
    tip: 'Mirror images. J’s corner is on the left, L’s is on the right.',
  },
  {
    ids: ['S', 'Z'],
    tip: 'Mirror images. S rises to the right, Z rises to the left.',
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

// Cells positioned inside the 4×4 spawn frame (see SPAWN_FRAME_SIZE).
export function framedCells(id, rotation) {
  const [dx, dy] = getPiece(id).frameOffset;
  return rawCells(id, rotation).map(([x, y]) => [x + dx, y + dy]);
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
