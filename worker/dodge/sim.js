// 鲁班七号躲技能: the whole game as a deterministic simulation. The browser
// runs it to play; the server runs it again on the player's recorded inputs
// to check how long they really survived, so a score can't be made up.
// Deterministic means: a seeded random generator, a fixed 60 ticks a second,
// and only + - * / and sqrt on numbers (Math.sin / cos can differ in the last
// digit between browsers, so the few angles we need come from our own sine).
//
// Inputs are events [tick, type, a, b], applied at the start of that tick:
//   [t, 0, x, y]  move to (x, y)              (PC: right-click)
//   [t, 1, k]     move in direction k (0..63), -1 to stop   (phone joystick)
//   [t, 2, k]     闪现 in direction k, -1 = the way you're facing
export const HZ = 60;
export const W = 1280, H = 800;
export const HERO = { r: 24, speed: 5.4, flash: 230, flashCd: 8 * HZ };
export const DIRS = 64;
const MAX_TICKS = 10 * 60 * HZ; // a run stops counting after 10 minutes

// ---- deterministic sine, and the 64 directions ----
const PI = 3.141592653589793;
function dsin(x) { // any x; Taylor series on [-π/2, π/2] after reducing
  while (x > PI) x -= 2 * PI;
  while (x < -PI) x += 2 * PI;
  if (x > PI / 2) x = PI - x; else if (x < -PI / 2) x = -PI - x;
  const x2 = x * x;
  return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110 * (1 - x2 / 156))))));
}
const dcos = x => dsin(x + PI / 2);
export const DIR = Array.from({ length: DIRS }, (_, k) => [dcos(2 * PI * k / DIRS), dsin(2 * PI * k / DIRS)]);
const SPREAD = [dcos(0.26), dsin(0.26)]; // 安琪拉's fireballs fan out about 15°

// ---- seeded random (mulberry32) ----
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const norm = (dx, dy) => { const d = Math.sqrt(dx * dx + dy * dy) || 1; return [dx / d, dy / d]; };
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ---- the enemy skills ----
// Every skill warns first (warn ticks: a line / circle on the ground), then
// goes off. They get faster, warn for less time, come more often and in
// bigger waves as the run goes on; new ones join at `from` seconds.
export const SKILLS = {
  hook: { who: '钟馗', what: '钩子', from: 0, warn: 24, speed: 21, r: 20, len: 1500 },
  fire: { who: '安琪拉', what: '火球', from: 0, warn: 24, speed: 10, r: 22, len: 2000 },
  ice: { who: '王昭君', what: '冰', from: 6, warn: 56, r: 120, live: 8 },
  fan: { who: '小乔', what: '扇子', from: 14, warn: 28, speed: 12.5, r: 26, len: 950 },
  bird: { who: '后羿', what: '大鸟', from: 22, warn: 42, speed: 8, r: 58, len: 2300 },
  beam: { who: '姜子牙', what: '激光', from: 32, warn: 64, r: 34, live: 12, len: 2400 },
};
const KINDS = Object.keys(SKILLS);

export function newGame(seed) {
  return {
    tick: 0, over: false, by: null, rand: rng(seed),
    hero: { x: W / 2, y: H / 2, mode: null, tx: 0, ty: 0, k: -1, fx: 1, fy: 0, cd: 0, blink: null },
    skills: [], next: HZ,
  };
}

function apply(g, [, type, a, b]) {
  const h = g.hero;
  if (type === 0) { h.mode = 'to'; h.tx = clamp(a, 0, W); h.ty = clamp(b, 0, H); }
  else if (type === 1) { if (a < 0) h.mode = null; else { h.mode = 'dir'; h.k = a; } }
  else if (type === 2 && h.cd === 0) {
    const [c, s] = a >= 0 ? DIR[a] : [h.fx, h.fy];
    const x0 = h.x, y0 = h.y;
    h.x = clamp(h.x + c * HERO.flash, HERO.r, W - HERO.r);
    h.y = clamp(h.y + s * HERO.flash, HERO.r, H - HERO.r);
    h.fx = c; h.fy = s; h.cd = HERO.flashCd;
    h.blink = { x0, y0, t: g.tick };
  }
}

function moveHero(g) {
  const h = g.hero, sp = HERO.speed;
  if (h.mode === 'to') {
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d <= sp) { h.x = h.tx; h.y = h.ty; h.mode = null; }
    else { h.fx = dx / d; h.fy = dy / d; h.x += h.fx * sp; h.y += h.fy * sp; }
  } else if (h.mode === 'dir') {
    [h.fx, h.fy] = DIR[h.k];
    h.x += h.fx * sp; h.y += h.fy * sp;
  }
  h.x = clamp(h.x, HERO.r, W - HERO.r);
  h.y = clamp(h.y, HERO.r, H - HERO.r);
  if (h.cd > 0) h.cd--;
}

// A point just outside one of the four walls.
function edge(g) {
  const side = Math.floor(g.rand() * 4), u = g.rand();
  if (side === 0) return [u * W, -30];
  if (side === 1) return [u * W, H + 30];
  if (side === 2) return [-30, u * H];
  return [W + 30, u * H];
}

function spawnOne(g, kind, sec) {
  const def = SKILLS[kind], h = g.hero;
  const fast = Math.min(1.5, 1 + sec / 150);              // projectiles speed up
  const warn = Math.round(def.warn * Math.max(0.55, 1 - sec / 180)); // and warn for less time
  const base = { kind, t0: g.tick, warn };
  if (kind === 'ice') {
    g.skills.push({ ...base, x: h.x, y: h.y, r: def.r, live: def.live });
    return;
  }
  const [x0, y0] = edge(g);
  const [dx, dy] = norm(h.x - x0, h.y - y0);
  if (kind === 'beam') { g.skills.push({ ...base, x0, y0, dx, dy, r: def.r, live: def.live, len: def.len }); return; }
  const shot = (ux, uy) => g.skills.push({ ...base, x0, y0, dx: ux, dy: uy, d: 0, back: false, speed: def.speed * fast, r: def.r, len: def.len });
  if (kind === 'fire') {
    const [c, s] = SPREAD;
    shot(dx, dy);
    shot(dx * c - dy * s, dx * s + dy * c);
    shot(dx * c + dy * s, -dx * s + dy * c);
  } else shot(dx, dy);
}

function spawn(g) {
  if (g.tick < g.next) return;
  const sec = g.tick / HZ;
  const pool = KINDS.filter(k => sec >= SKILLS[k].from);
  const n = Math.min(5, 1 + Math.floor(sec / 25));           // more skills per wave…
  for (let i = 0; i < n; i++) spawnOne(g, pool[Math.floor(g.rand() * pool.length)], sec);
  g.next = g.tick + Math.round(HZ * Math.max(0.32, 1.5 / (1 + sec / 25))); // …and waves come faster
}

const hits = (ax, ay, ar, h) => { const dx = ax - h.x, dy = ay - h.y, rr = ar + HERO.r; return dx * dx + dy * dy <= rr * rr; };
function nearSegment(s, h, len) { // distance from the hero to the beam's centre line
  let t = (h.x - s.x0) * s.dx + (h.y - s.y0) * s.dy;
  t = clamp(t, 0, len);
  const px = s.x0 + s.dx * t - h.x, py = s.y0 + s.dy * t - h.y;
  return Math.sqrt(px * px + py * py);
}
// Where a moving skill's head is now (for drawing too).
export const headOf = s => [s.x0 + s.dx * s.d, s.y0 + s.dy * s.d];

function updateSkills(g) {
  const h = g.hero, keep = [];
  for (const s of g.skills) {
    const age = g.tick - s.t0;
    if (age < s.warn) { keep.push(s); continue; }
    let hit = false, done = false;
    if (s.kind === 'ice') {
      const dx = s.x - h.x, dy = s.y - h.y;
      const rr = s.r + HERO.r * 0.5;
      hit = dx * dx + dy * dy <= rr * rr;
      done = age >= s.warn + s.live;
    } else if (s.kind === 'beam') {
      hit = nearSegment(s, h, s.len) <= s.r + HERO.r;
      done = age >= s.warn + s.live;
    } else {
      if (s.kind === 'fan' && s.back) s.d -= s.speed; else s.d += s.speed;
      if (s.kind === 'fan' && !s.back && s.d >= s.len) s.back = true; // 小乔's fan flies back
      const [x, y] = headOf(s);
      hit = hits(x, y, s.r, h);
      done = s.kind === 'fan' ? s.back && s.d <= 0 : s.d >= s.len;
    }
    if (hit) { g.over = true; g.by = s.kind; }
    if (!done) keep.push(s);
  }
  g.skills = keep;
}

// One tick: inputs, the hero moves, new skills, skills move and hit.
export function step(g, events) {
  if (g.over) return;
  for (const e of events) apply(g, e);
  moveHero(g);
  spawn(g);
  updateSkills(g);
  g.tick++;
  if (g.tick >= MAX_TICKS) g.over = true;
}

// The server's check: play the recorded inputs again from the same seed.
// Returns the ticks survived, or null if the inputs aren't well-formed.
export function replay(seed, events) {
  if (!Array.isArray(events) || events.length > MAX_TICKS * 3) return null;
  const g = newGame(seed);
  let i = 0;
  while (!g.over) {
    const now = [];
    while (i < events.length && events[i][0] === g.tick) now.push(events[i++]);
    if (i < events.length && !(events[i][0] > g.tick)) return null; // out of order or not a number
    for (const e of now) if (!validEvent(e)) return null;
    step(g, now);
  }
  return { ticks: g.tick, by: g.by };
}
const int = v => Number.isInteger(v);
function validEvent(e) {
  if (!Array.isArray(e) || !int(e[0]) || !int(e[1])) return false;
  if (e[1] === 0) return int(e[2]) && int(e[3]) && e[2] >= 0 && e[2] <= W && e[3] >= 0 && e[3] <= H;
  if (e[1] === 1 || e[1] === 2) return int(e[2]) && e[2] >= -1 && e[2] < DIRS;
  return false;
}
