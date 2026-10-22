# tetrain.gg

**Play it at [tetrain-gg.vercel.app](https://tetrain-gg.vercel.app).**

tetrain.gg helps you memorize the Tetris Guideline piece colors and shapes until you recognize every piece, in any rotation, instantly. It works on desktop and on your phone.

## Modes

- **Learn:** all 7 pieces in every rotation, each in a 4×4 grid that matches how pieces spawn in the game. Hover a piece (or press and hold on a phone) for its mnemonic and a one-line description.
- **Quiz:** three kinds of question, always at a random rotation:
  - **Shape → Color:** a gray piece; pick its color.
  - **Color → Shape:** a color; pick the matching gray piece.
  - **Shape → Name:** a gray piece; pick its letter.

  Answers in a row build a combo, with a popup and a rising sound like line-clear combos in tetr.io, plus a block burst every 5. A wrong answer flashes the right one in color. Pieces you miss come up more often until you improve, especially J/L and S/Z mix-ups.

  For a **timed run**, pick **15s** or **30s** and press **▶ Start timed run**. It ends with your score, accuracy, average answer time and best streak, and each length keeps its own best.
- **Stats:** for each piece, your attempts, accuracy and average time.

**Keyboard:** answer with **1–7**, or press the piece's letter (**I O T S Z J L**). **M** toggles sound.

Your stats are saved in your own browser only. Clearing site data or switching browsers or devices starts you fresh. **Reset stats** on the Stats page clears them on purpose. The app reopens on the tab you used last.

## The pieces

| Piece | Color  | Mnemonic | Hex       | Shape                          |
|-------|--------|----------|-----------|--------------------------------|
| I     | Cyan   | icicle   | `#00F0F0` | 4 in a row                     |
| O     | Yellow | omelet   | `#F0F000` | 2×2 square                     |
| T     | Purple | testicle | `#A000F0` | 3 in a row, bump in the middle |
| S     | Green  | spinach  | `#00F000` | Zigzag, rises to the right     |
| Z     | Red    | zit      | `#F00000` | Zigzag, rises to the left      |
| J     | Blue   | jeans    | `#0000F0` | 3 in a row, corner on the left |
| L     | Orange | lava     | `#F0A000` | 3 in a row, corner on the right |

Rotations follow SRS, the standard rotation system in modern Tetris.

---

## Development

Plain HTML/CSS/JS with native ES modules. No framework, no build step and no dependencies.

```bash
npm run dev
```

The dev server runs at http://localhost:5173 and needs Node 20+. Browsers block ES modules on `file://` URLs, so opening `index.html` straight from disk won't work.

```bash
npm test
```

The tests use Node's built-in test runner. They check that every piece has exactly 4 cells in all 4 rotations, that each rotation is the previous one turned clockwise, that the colors match the guideline, and that board placement and stats weighting work. `/test.html` shows every piece in every rotation for a visual check.

**Deploys:** every push to `main` goes live at tetrain-gg.vercel.app through Vercel. Other branches get preview links. `vercel.json` tells Vercel to serve the repo root as-is, minus the dev files listed in `.vercelignore`.

### Where the piece data lives

**`src/pieces.js` is the single source of truth.** It holds each piece's color, mnemonic, description, cell coordinates for all four SRS rotations (`0`, `R`, `2`, `L`) and the confusable pairs. Nothing else hardcodes a piece color, and every piece is drawn from this data as a grid of cells.

### Project layout

```
index.html          app shell (tab bar + <main>)
styles.css          dark theme, beveled block cells, mobile layout
test.html           visual check: every piece × every rotation
serve.js            zero-dependency dev server
vercel.json         static hosting config
.vercelignore       dev files kept off the live site
src/
  pieces.js         piece data (colors, hints, SRS rotations)  ← source of truth
  board.js          board model: 2D array, canPlace, place, legalPlacements …
  render.js         renderBoard / renderPiece / renderSwatch (DOM grid)
  stats.js          localStorage stats + weighted piece selection
  sfx.js            synthesized sound effects (Web Audio) + mute setting
  dom.js            tiny element helper + formatters
  main.js           tab navigation; registers modes
  modes/            learn.js, quiz.js, stats.js
tests/              node --test unit tests
```

### Adding a mode (e.g. "Fill the Gap")

Create `src/modes/<name>.js` that returns `{ el, onShow, onHide }`, then add it to `MODES` in `src/main.js`. The board model is ready for a Fill the Gap mode:

- A board is `board[y][x]`. Each cell is `null` (empty), a piece letter (`'I'`…`'L'`) or `'G'` (gray). `boardFromRows(['GG..', 'G...'])` builds one from strings.
- `canPlace(board, piece, rotation, x, y)` and `place(...)` treat `(x, y)` as the top-left corner of the piece. `place` returns a new board.
- `legalPlacements`, `emptyCells` and `isFull` help generate and check puzzles. `renderBoard(board, { showGrid: true })` draws any board.
