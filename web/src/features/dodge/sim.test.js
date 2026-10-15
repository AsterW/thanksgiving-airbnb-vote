import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, step, sweptHit, HERO, W, H, HZ, SKILLS } from './sim.js';
import { VIEW, pointInArena } from './viewport.js';

const emptyGame = () => { const g = newGame(1); g.next = Infinity; return g; };
const shot = (kind, values = {}) => ({ kind, t0: 0, x0: 100, y0: 400, dx: 1, dy: 0, d: 0, back: false, ...SKILLS[kind], ...values, warn: 0 });

test('scenery padding preserves pointer coordinates at every display scale', () => {
  for (const scale of [.3, .75, 1, 2]) {
    const rect = { left: 40, top: 75, width: VIEW.width * scale, height: VIEW.height * scale };
    for (const [x, y] of [[0, 0], [W / 2, H / 2], [W, H]]) {
      assert.deepEqual(pointInArena(rect.left + (VIEW.left + x) * scale, rect.top + (VIEW.top + y) * scale, rect), [x, y]);
    }
    assert.deepEqual(pointInArena(rect.left, rect.top, rect), [0, 0]);
    assert.deepEqual(pointInArena(rect.left + rect.width, rect.top + rect.height, rect), [W, H]);
  }
});

test('a fast projectile hits along its swept path, including relative hero movement', () => {
  assert.equal(sweptHit(0, 100, 200, 100, 5, { x: 100, y: 100 }, { x: 100, y: 100 }), true);
  assert.equal(sweptHit(0, 100, 200, 100, 5, { x: 100, y: 0 }, { x: 100, y: 200 }), true);
  assert.equal(sweptHit(0, 100, 200, 100, 5, { x: 100, y: 200 }, { x: 100, y: 200 }), false);
});

test('flash crosses hazards instantly, clears click target, and obeys cooldown', () => {
  const g = emptyGame(); g.hero.x = 100; g.hero.y = 400;
  g.skills = [shot('hook', { x0: 210, speed: 1 })];
  step(g, [[0, 0, 30, 400], [0, 2, 0]]);
  assert.equal(g.over, false); assert.ok(Math.abs(g.hero.x - 100 - HERO.flash) < 1e-5);
  assert.equal(g.hero.mode, null);
  const x = g.hero.x;
  step(g, [[1, 2, 0]]); assert.equal(g.hero.x, x);
  assert.equal(g.hero.cd, HERO.flashCd - 2);
});

test('flash does not protect an unsafe landing', () => {
  const g = emptyGame(); g.hero.x = 100; g.hero.y = 400;
  g.skills = [shot('hook', { x0: 100 + HERO.flash, speed: 1 })];
  step(g, [[0, 2, 0]]); assert.equal(g.over, true); assert.equal(g.by, 'hook');
});

test('clicking beyond the reachable edge stops at the boundary', () => {
  const g = emptyGame();
  step(g, [[0, 0, W, H]]);
  for (let i = 0; i < 200; i++) step(g, []);
  assert.equal(g.hero.x, W - HERO.r); assert.equal(g.hero.y, H - HERO.r);
  assert.equal(g.hero.mode, null);
});

test('a returning fan still hits', () => {
  const g = emptyGame(); g.hero.x = 200; g.hero.y = 400;
  g.skills = [shot('fan', { d: 110, back: true, speed: 10 })];
  step(g, []); assert.equal(g.over, true);
});

test('the hook disappears at maximum range without a return phase', () => {
  const g = emptyGame();
  const hook = shot('hook', { y0: 50, len: 120, d: 100, speed: 20 });
  g.skills = [hook];
  step(g, []);
  assert.equal(g.over, false); assert.equal(g.skills.length, 0);
  assert.equal(hook.back, false);
  for (let i = 0; i < 20; i++) step(g, []);
  assert.equal(g.skills.length, 0);
});

test('expired ice and beam have no extra damaging tick', () => {
  for (const kind of ['ice', 'beam']) {
    const g = emptyGame(); g.tick = SKILLS[kind].live;
    g.skills = [shot(kind, { x: g.hero.x, y: g.hero.y })];
    step(g, []); assert.equal(g.over, false); assert.equal(g.skills.length, 0);
  }
});

test('fire volley has three paths converging on the locked target', () => {
  const g = emptyGame(); g.next = 0;
  const values = [.75, 0, .5]; g.rand = () => values.shift() ?? .5;
  step(g, []);
  assert.equal(g.skills.length, 3);
  for (const s of g.skills) {
    assert.equal(s.kind, 'fire');
    const tx = g.hero.x - s.x0, ty = g.hero.y - s.y0;
    assert.ok(Math.abs(tx * s.dy - ty * s.dx) < 1e-8);
  }
  assert.equal(g.skills.filter(s => s.leader).length, 1);
});

test('the same seed and input stream produce the same outcome', () => {
  const a = newGame(123), b = newGame(123);
  for (let t = 0; t < HZ * 60 && !a.over; t++) {
    const events = t % 90 === 0 ? [[t, 1, Math.floor(t / 90) % 64]] : [];
    step(a, events); step(b, events);
  }
  assert.equal(a.tick, b.tick); assert.equal(a.by, b.by);
  assert.deepEqual(a.hero, b.hero); assert.deepEqual(a.skills, b.skills);
});
