# Tetromino Trainer

A small web app that drills the Tetris Guideline piece colors and shapes until
you recognize every piece, in every rotation, instantly.

- **Learn**: all 7 pieces with color, name, every rotation, memory hints, and the J/L and S/Z mirror pairs called out.
- **Quiz**: Shape → Color, Color → Shape, Shape → Name, always at random rotations. Wrong answers flash the correct one in color. Pieces you miss (especially J/L and S/Z mix-ups) come up more often. Streak, accuracy, average response time, keys 1–7, and a 60-second speed round.
- **Stats**: per-piece attempts, accuracy, average time, and your most common mistake (e.g. `J → you answered L 6×`).

Plain HTML/CSS/JS with native ES modules. No framework, no build step, no dependencies.

## Run it

Needs Node 20+ (only for the dev server and tests).

```bash
npm run dev
```

Then open http://localhost:5173. The rotation test page is at http://localhost:5173/test.html.

Opening `index.html` straight from disk won't work in most browsers, because they block ES modules on `file://` URLs.
Any static server works too, e.g. `npx serve` or `python -m http.server`.

## Tests

```bash
npm test
```

Uses Node's built-in test runner. It checks that every piece has exactly 4 distinct cells in all 4 rotations, that each SRS state is the previous one rotated clockwise, that colors match the guideline, and that board placement and stats weighting behave.

## Where the piece data lives

**`src/pieces.js` is the single source of truth.** It holds each piece's color name, hex value, memory hint, and cell coordinates for all four SRS rotation states (`0`, `R`, `2`, `L`), plus the confusable pairs. Nothing else in the app hardcodes a piece color. The renderer looks colors up from this file and draws every piece as a grid of cells.

| Piece | Color  | Hex       |
|-------|--------|-----------|
| I     | Cyan   | `#00F0F0` |
| O     | Yellow | `#F0F000` |
| T     | Purple | `#A000F0` |
| S     | Green  | `#00F000` |
| Z     | Red    | `#F00000` |
| J     | Blue   | `#0000F0` |
| L     | Orange | `#F0A000` |

In spawn orientation (true SRS), J has its corner at the **top-left** and L at the **top-right**. Stand them upright and J's hook points left and L's foot points right, like the letters.

## Project layout

```
index.html          app shell (tab bar + <main>)
styles.css          dark theme, beveled block cells, mobile layout
test.html           visual check: every piece × every rotation
serve.js            zero-dependency dev server
src/
  pieces.js         piece data (colors, hints, SRS rotations)  ← source of truth
  board.js          board model: 2D array, canPlace, place, legalPlacements …
  render.js         renderBoard / renderPiece / renderSwatch (DOM grid)
  stats.js          localStorage stats + weighted piece selection
  dom.js            tiny element helper + formatters
  main.js           tab navigation; registers modes
  modes/
    learn.js
    quiz.js
    stats.js
tests/              node --test unit tests
```

## Adding the "Fill the Gap" mode later

The shared pieces are ready for it:

- A **board** is `board[y][x]`, where each cell is `null` (empty), a piece id (`'I'`…`'L'`), or `'G'` (gray). `boardFromRows(['GG..', 'G...'])` builds one from strings.
- `canPlace(board, piece, rotation, x, y)` and `place(...)` use the piece's trimmed bounding box, so `(x, y)` is the top-left of the piece. `place` returns a new board.
- `legalPlacements(board, piece)`, `emptyCells(board)` and `isFull(board)` help with generating and checking puzzles. `tests/board.test.js` already fills one 4×2 rectangle four different ways (J+J, L+L, O+O, I+I).
- `renderBoard(board, { showGrid: true })` draws any board state.

To add the mode, create `src/modes/fill-gap.js` that returns `{ el, onShow, onHide }`, then add it to the `MODES` list in `src/main.js`.
