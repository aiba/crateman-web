// Crate Man rules, ported handler-for-handler from the decompiled Lingo in decompiled/.
// Cells are numbered 1..234 on an 18x13 grid, row-major, exactly as in the original.
// Works headless (Node: require) and in the browser (global CrateMan).
(function (root) {
  const W = 18, H = 13, N = W * H;
  const EMPTY = 0, SCAFFOLD = 1, CRATE = 2, DOOR = 6, BALL = 7, BRIDGE = 10;
  const CODES = { X: EMPTY, C: CRATE, D: DOOR, T: BALL, S: SCAFFOLD, R: EMPTY, M: EMPTY, B: BRIDGE };
  const RIGHT = 2, LEFT = 4;
  const col = (i) => (i - 1) % W;
  const gx = (i) => 50 + 30 * col(i);
  const gy = (i) => 37 + 30 * Math.floor((i - 1) / W);

  class Game {
    // text: 234 chars of X C D T S R M B (the "puzzles" field, one line per puzzle)
    constructor(text) {
      this.onFrame = null; // (ticks) => void, called at every original updateStage()/countN()
      this.onSound = null;
      this.g = new Array(N + 1).fill(0);
      this.doors = [0, 0, 0];
      this.crate = 0;
      text = text.toUpperCase(); // Lingo string compare is case-insensitive (puzzle 42 has an 's')
      for (let n = 1; n <= N; n++) {
        const ch = text[n - 1];
        this.g[n] = CODES[ch];
        if (ch === 'D') this.doors[this.doors[1] ? 2 : 1] = n;
        if (ch === 'R') this.crate = n;
        if (ch === 'M') this.mg = n;
      }
      this.dr = RIGHT; this.odr = RIGHT;
      this.carry = 0; this.cf = 0; this.bridgeflag = 0; this.elen = 0; this.doorflag = 0;
      this.gameover = 0; this.moves = 0;
      // transient sprites, for rendering only
      this.cast = 'mr1'; this.man = { x: gx(this.mg), y: gy(this.mg) };
      this.s20 = null; this.s22 = null; this.s21 = null; this.doorAnim = null; this.hide = 0;
    }

    v(i) { return i >= 1 && i <= N ? this.g[i] : -1; } // out-of-range reads act as solid
    frame(ticks) { if (this.onFrame) this.onFrame(ticks || 0); }
    sound(name) { if (this.onSound) this.onSound(name); }
    stand() { this.cast = this.dr === RIGHT ? 'mr1' : 'ml1'; }
    manAt(i) { this.man = { x: gx(i), y: gy(i) }; }

    // --- public API -------------------------------------------------------
    // key: 'U' jump, 'L'/'R' turn or walk, 'D' lift/place crate. Returns true once solved.
    // One call = one GETDIR plus one pass of the original frame script.
    step(key) {
      if (this.gameover) return true;
      this.getdir(key);
      this.tick();
      return this.gameover === 1;
    }
    tick() {
      this.checkbridge();
      this.checkforcrate();
      if (this.gameover) return;
      this.manfall();
      if (this.doorflag === 0) this.checkdoors();
    }
    play(keys) { for (const k of keys) if (this.step(k)) return true; return false; }
    // Canonical state string (everything that affects future play).
    key() {
      return [this.g.slice(1).join(''), this.mg, this.dr, this.odr, this.carry, this.bridgeflag, this.elen, this.doorflag].join('|');
    }
    clone() {
      const c = Object.create(Game.prototype);
      Object.assign(c, this, { g: this.g.slice(), doors: this.doors.slice(), man: { ...this.man }, onFrame: null, onSound: null });
      return c;
    }

    // --- GETDIR -----------------------------------------------------------
    getdir(k) {
      const { g } = this;
      this.checkbridge();
      if (k === 'U') {
        if (this.mg < 19) return;
        this.jump();
        this.moves++;
      }
      if (k === 'R') {
        this.moves++;
        this.cast = 'mr1'; this.frame();
        this.dr = RIGHT;
        if (col(this.mg) === W - 1) return;
        this.moveman();
      }
      if (k === 'D') {
        const mg = this.mg, dr = this.dr;
        if (dr === RIGHT && col(mg) === W - 1) return;
        if (dr === LEFT && col(mg) === 0) return;
        if (mg < 19) return;
        this.moves++;
        if (this.carry === 0) {
          if (dr === RIGHT && this.v(mg + 1) !== CRATE) return;
          if (dr === LEFT && this.v(mg - 1) !== CRATE) return;
          if (this.v(mg - 18) !== 0) return;
          if (dr === RIGHT && this.v(mg - 17) !== 0) return;
          if (dr === LEFT && this.v(mg - 19) !== 0) return;
          this.cast = dr === RIGHT ? 'liftr' : 'liftl';
          this.frame(7);
          this.liftcrate();
          return;
        }
        if (dr === RIGHT && this.v(mg - 17) !== 0) return;
        if (dr === LEFT && this.v(mg - 19) !== 0) return;
        this.placecrate();
      }
      if (k === 'L') {
        this.cast = 'ml1'; this.frame();
        this.dr = LEFT;
        if (col(this.mg) === 0) return;
        this.moves++;
        this.moveman();
      }
    }

    moveman() {
      if (this.doorflag === 0) this.checkdoors();
      if (this.doors[1] !== this.mg && this.doors[2] !== this.mg) this.doorflag = 0;
      this.checkbridge();
      this.manfall();
      if (this.dr !== this.odr) { // first press only turns
        this.odr = this.dr; this.stand(); this.frame();
        return;
      }
      const d = this.dr === RIGHT ? 1 : -1;
      const a = this.v(this.mg + d);
      if (a === EMPTY || a === BALL || a === DOOR) {
        if (col(this.mg) === (d === 1 ? W - 1 : 0)) return;
        this.walk(d);
      }
      this.manfall();
    }

    // walkright / walkleft
    walk(d) {
      const mg = this.mg, R = d === 1;
      const upAhead = R ? mg - 17 : mg - 19;
      const [w1, w2, w3] = R ? ['mr1', 'mr2', 'mr3'] : ['ml1', 'ml2', 'ml3'];
      this.cf = 0;
      if (this.v(mg + d) === BALL) {
        if (this.carry !== 0) return;
        if (R ? col(mg + 1) >= W - 1 : col(mg - 1) === 0) return;
        if (this.v(mg + 2 * d) !== 0) return;
        if (mg > (R ? 18 : 19) && (this.v(upAhead) === CRATE || this.v(upAhead) === BALL)) return;
        this.cast = R ? 'liftr' : 'liftl'; this.frame(15);
        this.cast = w1; this.frame();
        this.roll(d);
        return;
      }
      if (this.carry === 1) {
        this.s20 = { x: gx(mg - 18), y: gy(mg - 18) }; this.frame();
        if (this.v(upAhead) !== 0 || upAhead === this.crate) { // crate knocked off his head
          this.carry = 0;
          this.cf = mg - 18;
        }
      }
      this.sound('steps');
      let flag = 0;
      for (let n = 1; n <= 4; n++) {
        flag += n === 4 ? 9 : 7;
        this.cast = n === 1 ? w2 : n === 3 ? w3 : w1;
        this.man = { x: gx(mg) + d * flag, y: gy(mg) };
        if (mg > 18 && this.carry === 1) this.s20 = { x: gx(mg - 18) + d * flag, y: gy(mg - 18) };
        this.frame(4);
      }
      this.mg = mg + d;
      if (this.cf !== 0) this.cratefall();
      if (!this.carry) this.s20 = null;
      this.frame();
    }

    // rollright / rollleft: ball rolls until blocked, dropping down any holes on the way
    roll(d) {
      let r = this.mg + d;
      const edge = d === 1 ? W - 1 : 0;
      for (;;) {
        if (col(r) === edge) break;
        if (this.v(r + d) !== 0) break;
        if (r + d === this.crate) break;
        this.hide = r;
        for (let n = 1; n <= 2; n++) {
          this.sound('ballroll');
          this.s22 = { cast: n === 1 ? 'roll1' : 'roll', x: gx(r) + d * 15 * n, y: gy(r) };
          this.frame(4);
        }
        this.g[r] = 0; r += d; this.g[r] = BALL;
        while (r < 217 && this.v(r + 18) === 0) {
          this.hide = r;
          for (let n = 1; n <= 2; n++) {
            this.s22 = { cast: n === 1 ? 'roll1' : 'roll', x: gx(r), y: gy(r) + 15 * n };
            this.frame(2);
          }
          this.g[r] = 0; r += 18; this.g[r] = BALL;
        }
      }
      this.sound('thud1');
      this.s22 = null; this.hide = 0;
      this.frame();
    }

    jump() {
      const R = this.dr === RIGHT, d = R ? 1 : -1;
      this.elen = 0;
      if (R && col(this.mg) === W - 1) return;
      // (the original's left-edge test here compares a y to an x and never fires)
      if (this.v(this.mg - 18) !== 0) return;
      if (this.carry === 1) {
        if (this.mg < 37) return;
        if (this.v(this.mg - 36) !== 0) return;
        if (this.mg - 36 === this.crate) return;
      }
      this.cast = R ? 'jr1' : 'jl1'; this.frame(15);
      this.stand(); this.frame(2);
      if (this.carry === 1) { this.s20 = { x: gx(this.mg - 18), y: gy(this.mg - 18) }; this.frame(); }
      for (let n = 1; n <= 3; n++) {
        if (this.carry === 1) this.s20 = { x: gx(this.mg - 18), y: gy(this.mg - 18) - 10 * n };
        this.man = { x: gx(this.mg), y: gy(this.mg) - 10 * n };
        this.frame(2);
      }
      this.mg -= 18;
      const upAhead = R ? this.mg - 17 : this.mg - 19;
      if (this.carry === 1) {
        this.elen = 1;
        if (this.v(upAhead) !== 0) return;
        if (upAhead === this.crate) return;
      }
      if (this.mg === this.crate) return;
      if (col(this.mg) === (R ? W - 1 : 0)) return;
      const a = this.v(this.mg + d);
      if (a === EMPTY || a === DOOR) {
        for (let n = 1; n <= 3; n++) {
          if (this.carry === 1) this.s20 = { x: gx(this.mg - 18) + d * 10 * n, y: gy(this.mg - 18) };
          this.man = { x: gx(this.mg) + d * 10 * n, y: gy(this.mg) };
          this.frame(7);
        }
        this.mg += d;
      }
      if (this.carry === 1) { this.frame(); this.s20 = null; this.frame(); }
      this.manfall();
      this.checkbridge();
    }

    liftcrate() {
      const R = this.dr === RIGHT, mg = this.mg;
      this.cast = R ? 'upr1' : 'upl1'; this.frame();
      const side = R ? mg + 1 : mg - 1, upAhead = R ? mg - 17 : mg - 19;
      if (this.carry === 0 && this.v(upAhead) === 0) {
        this.sound('lift');
        this.s20 = { x: gx(side), y: gy(side) }; this.frame();
        this.g[side] = 0;
        this.s20 = { x: gx(mg - 18), y: gy(mg - 18) }; this.frame();
        this.carry = 1;
      }
      this.frame(7);
      this.stand(); this.frame();
    }

    placecrate() {
      const R = this.dr === RIGHT, d = R ? 1 : -1, mg = this.mg;
      this.cast = R ? 'upr1' : 'upl1';
      this.s20 = { x: gx(mg - 18), y: gy(mg - 18) }; this.frame();
      for (let n = 1; n <= 3; n++) {
        this.s20 = { x: gx(mg - 18) + d * 10 * n, y: gy(mg - 18) };
        this.frame(4);
      }
      this.cf = R ? mg - 17 : mg - 19;
      this.g[this.cf] = CRATE;
      this.frame();
      this.s20 = null;
      this.stand(); this.frame();
      this.carry = 0;
      this.cratefall();
    }

    cratefall() {
      const { g } = this;
      g[this.cf] = CRATE;
      if (this.cf > 216) return;
      if (this.cf + 18 === this.crate) return;
      if (this.v(this.cf + 18) !== 0) return;
      this.checkbridge();
      let fl = 0;
      while (fl === 0 && this.cf < 217) {
        if (this.v(this.cf + 18) === 0) {
          this.hide = this.cf;
          for (let n = 1; n <= 3; n++) {
            this.s20 = { x: gx(this.cf), y: gy(this.cf) + 10 * n };
            this.frame(2);
          }
          g[this.cf] = 0; this.cf += 18; g[this.cf] = CRATE;
          this.hide = 0; this.s20 = null;
          if (this.cf + 18 !== this.crate && this.cf <= 216 && this.v(this.cf + 18) !== 0) fl = 1;
          this.sound('thud');
          this.frame();
          this.carry = 0;
        }
        // (as in the original, a crate resting directly above the red crate's cell ends the
        // loop only via the checks above; the original would spin forever here otherwise)
        else break;
      }
    }

    manfall() {
      let first = 0;
      if (this.mg > 216) return;
      if (this.v(this.mg + 18) !== 0) return;
      if (this.crate === this.mg) return;
      if (this.carry === 1) { this.s20 = { x: gx(this.mg - 18), y: gy(this.mg - 18) }; this.frame(); }
      let fl = 0;
      while (fl === 0 && this.mg < 217) {
        first++;
        if (this.v(this.mg + 18) === 0) {
          for (let n = 1; n <= 3; n++) {
            this.man = { x: gx(this.mg), y: gy(this.mg) + 10 * n };
            if (this.carry === 1) this.s20 = { x: gx(this.mg - 18), y: gy(this.mg - 18) + 10 * n };
            this.frame(2);
          }
          this.mg += 18;
          if (this.crate === this.mg) return;
        }
        if (first === 1) this.checkbridge();
        if (this.crate === this.mg) return;
        if (this.mg <= 216 && this.v(this.mg + 18) !== 0) fl = 1;
      }
      if (this.carry === 1) this.frame();
      this.checkbridge();
    }

    // A bridge tile collapses once he has stepped off it.
    checkbridge() {
      if (this.elen === 1) { this.elen = 0; return; }
      if (this.mg > 216) return;
      if (this.bridgeflag !== 0) {
        if (this.v(this.mg + 18) === BRIDGE && this.mg + 18 === this.bridgeflag) return;
        const b = this.bridgeflag;
        this.hide = b;
        this.s21 = { cast: 'bridge1', x: gx(b), y: gy(b) }; this.frame(7);
        this.s21 = { cast: 'bridge2', x: gx(b), y: gy(b) }; this.frame(7);
        this.s21 = null; this.hide = 0;
        this.g[b] = 0;
        this.bridgeflag = 0;
        this.frame();
        return;
      }
      if (this.v(this.mg + 18) === BRIDGE) this.bridgeflag = this.mg + 18;
    }

    checkdoors() {
      if (this.doorflag !== 0) return;
      const from = this.mg === this.doors[1] ? 1 : this.mg === this.doors[2] ? 2 : 0;
      if (!from) return;
      const to = 3 - from;
      const hidden = this.man; this.man = null;
      this.sound('doorsnd');
      for (let n = 134; n <= 142; n++) { this.doorAnim = { door: from, cast: n }; this.frame(4); }
      this.sound('doorsnd');
      for (let n = 142; n <= 149; n++) { this.doorAnim = { door: to, cast: n }; this.frame(4); }
      this.doorAnim = null;
      this.doorflag = 1;
      this.mg = this.doors[to];
      this.stand();
      this.manAt(this.mg);
      this.frame();
    }

    checkforcrate() {
      if (this.mg !== this.crate) return;
      this.gameover = 1;
      this.cast = 'mancrate'; this.manAt(this.mg); this.s20 = null;
      this.frame();
      for (let n = 1; n <= 3; n++) { this.sound('bell'); this.frame(15); }
    }
  }

  const api = { Game, W, H, N, gx, gy, col, EMPTY, SCAFFOLD, CRATE, DOOR, BALL, BRIDGE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrateMan = api;
})(typeof self !== 'undefined' ? self : this);
