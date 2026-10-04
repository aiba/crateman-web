# Crate Man (web port)

A browser port of **Curtis the Crate Man**, a 1997 Windows 3.x puzzle game by Soleau Software
(William Soleau). Help Curtis reach the red crate in each of 50 warehouse rooms by walking,
jumping, stacking crates, rolling balls, crossing collapsing bridges and using doors.

## Play

**Play online: <https://aiba.github.io/crateman-web/>**

Or clone and open `index.html` in a browser. No build step, no server, no dependencies.

    git clone https://github.com/aiba/crateman-web
    open crateman-web/index.html

| Key | Action |
|---|---|
| ← → | turn, walk, push a ball |
| ↑ | jump (up and forward one cell) |
| ↓ | lift the crate in front of you / put it down |
| Z or Backspace | undo one step (unlimited) |
| Esc | restart the puzzle |

On a phone or tablet the page switches to a touch layout: swipe anywhere to move (← → walk, ↑ jump,
↓ lift/place; one swipe is one move, and resting your finger after a sideways swipe keeps walking) and tap **Undo** or **Restart**. Add `?mobile` or
`?desktop` to the URL to force either layout.

## How it was made

The original is a 16-bit Macromedia Director 6 projector, which no longer runs on modern
machines. Its Lingo scripts were decompiled and the game rules ported handler-for-handler to
plain JavaScript; the puzzle layouts, sprites and sounds were extracted from the projector.

| File | What |
|---|---|
| `engine.js` | Game rules. Headless, usable from Node: `new Game(text).step('U'|'D'|'L'|'R')`. |
| `data.js` | The 50 puzzle layouts + tutorial, and the solutions that shipped inside the game. |
| `index.html` | Canvas front end. |
| `verify.js` | `node verify.js` replays the shipped solutions through `engine.js`; all 51 must reach the crate. This is the regression test for rule fidelity. |
| `assets/` | Original bitmaps (PNG) and sounds (WAV). |
| `tools/` | Scripts used to unpack the installer and decode the Director bitmaps. |
| `decompiled/` | The decompiled Lingo scripts and raw Director resources. |
| `game/`, `original/` | The original shareware release, for reference. |

Not ported: intro and title screens, menus, help text, end-of-puzzle animations.

## Credits

Game design, puzzles, graphics and sound © Soleau Software. This is an unofficial fan
preservation port, not affiliated with or endorsed by Soleau Software. The original shareware
release is archived at <https://archive.org/details/CRATEMAN>.
