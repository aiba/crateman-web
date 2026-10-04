// Replays the solutions that shipped inside the original game through engine.js.
// If the port's rules match the original, every one must end on the red crate.
const { Game } = require('./engine.js');
const { puzzles, solutions } = require('./data.js');
let ok = 0;
puzzles.forEach((p, i) => {
  const g = new Game(p);
  let used = 0;
  for (const k of solutions[i]) { used++; if (g.step(k)) break; }
  const solved = g.gameover === 1;
  if (solved) ok++;
  console.log(`${String(i + 1).padStart(2)} ${solved ? 'solved' : 'FAILED'}  keys ${used}/${solutions[i].length}`);
});
console.log(`${ok}/${puzzles.length} shipped solutions reach the crate`);
process.exit(ok === puzzles.length ? 0 : 1);
