# Notes for agents working on this repo

See README.md for the file map.


- Layout format (`data.js`): 234 chars, 18×13 row-major. `X` empty, `S` scaffold, `C` crate, `T` ball, `B` bridge, `D` door (pair), `R` red goal crate, `M` man. Engine cell codes: 0/1/2/7/10/6.
- Original timing: solution playback runs one frame-script pass per key (`step()` does the same). Human play ran many passes per key; `tick()` is that pass.
- The owner intends to challenge an agent to solve puzzles unaided: don't read `solutions` in `data.js` when asked to solve.
- Engine quirks kept from the original on purpose: jump's left-edge test never fires; a falling crate passes through the red crate's cell; first press of the opposite direction only turns.
- Assets: all bitmaps are 8-bit, Director 5+ Windows system palette (`tools/pals.json`). ScummVM's own PNG dumps use the wrong (Mac) palette for most members — don't use them.
- Re-extract: `scummvm --path=game --dump-scripts director:director` in a scratch dir (kill it after ~45 s), then `castmap.py dumps` and `export_assets.py dumps assets`.
- ScummVM 2026.3.0 route is a dead end: FileIO `readFile` returns raw CP1252 treated as UTF-8 and `numToChar(negative)` loops forever, so the `+94`-ciphered score file hangs the game at startup and again after each first solve; graphics were also garbled. `run.sh` only works around the startup case. A hung instance ignores SIGTERM.
- No 16-bit Windows in macOS Wine; remaining emulator route would be DOSBox-X + Windows 3.1.
- `game/` is the installed original, `original/` the archive.org download, `decompiled/` the Lingo scripts and raw resource dump, `run.sh` a ScummVM launcher (buggy, see above).
