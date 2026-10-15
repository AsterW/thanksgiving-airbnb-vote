// 鲁班七号躲技能: the whole game as a simulation stepped 60 times a second.
// It's seeded and only uses + - * / and sqrt (with our own sine for the few
// angles), so the same seed and inputs always play out the same way: the
// browser plays it, and the server replays the inputs to get the score
// (verify.js); best runs can be watched again from the same inputs.
//
// Inputs are events [tick, type, a, b], applied at the start of that tick:
//   [t, 0, x, y]  move to (x, y)              (PC: right-click)
//   [t, 1, k]     move in direction k (0..63), -1 to stop   (phone joystick)
//   [t, 2, k]     闪现 in direction k, -1 = the way you're facing
export const HZ = 60;
export const W = 1280, H = 800;
export const HERO = { r: 24, speed: 5.4, flash: 230, flashCd: 8 * HZ };
export const DIRS = 64;
export const MAX_TICKS = 10 * 60 * HZ; // a run stops counting after 10 minutes
// Bump whenever a change makes the same seed and inputs play out differently:
// runs started under another version can't be checked or replayed.
export const SIM_VERSION = 1;

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
  hook: { who: '钟馗', what: '湮灭之锁', tip: '横向走位，避开出钩方向', from: 0, warn: 30, speed: 21, r: 20, len: 1500 },
  fire: { who: '安琪拉', what: '火球术', tip: '三枚火球汇聚，及时离开瞄准点', from: 0, warn: 30, speed: 10, r: 22, len: 2000 },
  ice: { who: '王昭君', what: '禁锢寒霜', tip: '冰圈锁定后，立即走出范围', from: 6, warn: 56, r: 120, live: 8 },
  fan: { who: '小乔', what: '绽放之舞', tip: '扇子会折返，留意回程', from: 14, warn: 28, speed: 12.5, r: 26, len: 950 },
  bird: { who: '后羿', what: '灼日之矢', tip: '大鸟范围宽，向两侧躲避', from: 22, warn: 42, speed: 8, r: 58, len: 2300 },
  beam: { who: '姜子牙', what: '断罪', tip: '蓄力时离开金色长条区域', from: 32, warn: 64, r: 34, live: 12, len: 2400 },
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
  if (type === 0) { h.mode = 'to'; h.tx = clamp(a, HERO.r, W - HERO.r); h.ty = clamp(b, HERO.r, H - HERO.r); }
  else if (type === 1) { if (a < 0) h.mode = null; else { h.mode = 'dir'; h.k = a; } }
  else if (type === 2 && h.cd === 0) {
    const [c, s] = a >= 0 ? DIR[a] : [h.fx, h.fy];
    const x0 = h.x, y0 = h.y;
    h.x = clamp(h.x + c * HERO.flash, HERO.r, W - HERO.r);
    h.y = clamp(h.y + s * HERO.flash, HERO.r, H - HERO.r);
    h.fx = c; h.fy = s; h.cd = HERO.flashCd;
    h.blink = { x0, y0, t: g.tick };
    // A previous click must not pull the hero back after a blink.
    if (h.mode === 'to') h.mode = null;
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
  const shot = (ux, uy, ox = x0, oy = y0, leader = true) => g.skills.push({ ...base, x0: ox, y0: oy, dx: ux, dy: uy, d: 0, back: false, leader, speed: def.speed * fast, r: def.r, len: def.len });
  if (kind === 'fire') {
    // Three separate launch positions converge on the locked target.
    for (let i = -1; i <= 1; i++) {
      const ox = x0 - dy * i * 42, oy = y0 + dx * i * 42;
      const [ux, uy] = norm(h.x - ox, h.y - oy);
      shot(ux, uy, ox, oy, i === 0);
    }
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

// Sweep relative motion, so fast projectiles cannot jump over a moving hero.
export function sweptHit(ax, ay, bx, by, r, from, to) {
  const x = ax - from.x, y = ay - from.y;
  const dx = bx - to.x - x, dy = by - to.y - y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? clamp(-(x * dx + y * dy) / len2, 0, 1) : 0;
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 <= (r + HERO.r) ** 2;
}
function nearSegment(s, h, len) { // distance from the hero to the beam's centre line
  let t = (h.x - s.x0) * s.dx + (h.y - s.y0) * s.dy;
  t = clamp(t, 0, len);
  const px = s.x0 + s.dx * t - h.x, py = s.y0 + s.dy * t - h.y;
  return Math.sqrt(px * px + py * py);
}
// Where a moving skill's head is now (for drawing too).
export const headOf = s => [s.x0 + s.dx * s.d, s.y0 + s.dy * s.d];

function updateSkills(g, previousHero) {
  const h = g.hero, keep = [];
  for (const s of g.skills) {
    const age = g.tick - s.t0;
    if (age < s.warn) { keep.push(s); continue; }
    let hit = false, done = false;
    if (s.kind === 'ice') {
      if (age >= s.warn + s.live) continue;
      const dx = s.x - h.x, dy = s.y - h.y;
      const rr = s.r + HERO.r * 0.5;
      hit = dx * dx + dy * dy <= rr * rr;
      done = age >= s.warn + s.live;
    } else if (s.kind === 'beam') {
      if (age >= s.warn + s.live) continue;
      hit = nearSegment(s, h, s.len) <= s.r + HERO.r;
      done = age >= s.warn + s.live;
    } else {
      const [px, py] = headOf(s);
      const returns = s.kind === 'fan';
      s.d = clamp(s.d + (s.back ? -s.speed : s.speed), 0, s.len);
      if (returns && !s.back && s.d >= s.len) s.back = true;
      const [x, y] = headOf(s);
      hit = sweptHit(px, py, x, y, s.r, previousHero, h);
      done = returns ? s.back && s.d <= 0 : s.d >= s.len;
    }
    if (hit && !g.over) { g.over = true; g.by = s.kind; }
    if (!done) keep.push(s);
  }
  g.skills = keep;
}

// One tick: inputs, the hero moves, new skills, skills move and hit.
export function step(g, events) {
  if (g.over) return;
  for (const e of events) apply(g, e);
  // Flash is instantaneous: collision starts at its destination, not its path.
  const previousHero = { x: g.hero.x, y: g.hero.y };
  moveHero(g);
  spawn(g);
  updateSkills(g, previousHero);
  g.tick++;
  if (g.tick >= MAX_TICKS) g.over = true;
}
