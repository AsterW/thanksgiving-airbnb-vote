import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, step, DIR, W, H, HERO, HZ } from './sim.js';
import { badEvents, replay } from './verify.js';

// Would the hero still be hit after this input, with no more input and no new skills?
function hitAfter(g, ev) {
  const c = { tick: g.tick, over: false, by: null, rand: () => 0, next: Infinity, hero: { ...g.hero, blink: null }, skills: g.skills.map(s => ({ ...s })) };
  step(c, [[c.tick, ...ev]]);
  for (let n = 0; !c.over && c.skills.length && n < 240; n++) step(c, []);
  return c.over && !!c.by;
}
// A test player: when new skills appear it looks ahead for a direction that
// gets it clear, and presses it `delay` ticks later (1 = as fast as possible).
function dodger(delay) {
  let due = null;
  return g => {
    const out = [];
    if (due && due.at <= g.tick) { out.push([g.tick, ...due.ev]); due = null; }
    if (!due && g.skills.some(s => s.t0 === g.tick - 1)) {
      for (let k = 0; k < 64; k += 4) {
        const ev = [0, Math.round(Math.min(W - HERO.r, Math.max(HERO.r, g.hero.x + DIR[k][0] * 300))), Math.round(Math.min(H - HERO.r, Math.max(HERO.r, g.hero.y + DIR[k][1] * 300)))];
        if (!hitAfter(g, ev)) { due = { at: g.tick + delay - 1, ev }; break; }
      }
    }
    return out;
  };
}
// Play a whole run the way the page does, recording every input.
function play(seed, player, max = 3 * 60 * HZ) {
  const g = newGame(seed), events = [];
  while (!g.over && g.tick < max) { const ev = player(g); events.push(...ev); step(g, ev); }
  return { g, events };
}

test('recorded inputs are checked for shape', () => {
  assert.equal(badEvents([[0, 0, 10, 20], [3, 1, 5], [3, 2, -1], [9, 1, -1]]), null);
  assert.equal(badEvents('nope'), 'events');
  assert.equal(badEvents([[5, 0, 1, 2], [4, 0, 1, 2]]), 'tick');      // out of order
  assert.equal(badEvents([[0, 1, 64]]), 'dir');
  assert.equal(badEvents([[0, 0, 1]]), 'move');
  assert.equal(badEvents([[0, 9, 1]]), 'type');
  assert.equal(badEvents([[0.5, 0, 1, 2]]), 'tick');
});

test('replaying the recorded inputs gives exactly the run that was played', () => {
  for (const seed of [11, 12, 13]) {
    const { g, events } = play(seed, dodger(14));
    const r = replay(seed, events);
    assert.equal(r.ticks, g.tick, 'seed ' + seed);
    assert.equal(r.by, g.by);
  }
});

test('the score comes from the inputs, not from what anyone claims', () => {
  const { g, events } = play(21, dodger(14));
  assert.ok(replay(21, []).ticks < g.tick, 'no inputs: dies sooner');
  assert.equal(replay(22, events).ticks === g.tick && replay(22, events).by === g.by, false, 'another seed plays out differently');
  // inputs after the hero died change nothing
  assert.equal(replay(21, [...events, [g.tick + 50, 1, 3]]).ticks, g.tick);
});

test('reacting on the next tick is marked 🤖; reacting like a person is not', () => {
  let bots = 0, people = 0;
  for (const seed of [1, 2, 3, 4]) {
    const fast = replay(seed, play(seed, dodger(1)).events);
    const slow = replay(seed, play(seed, dodger(15)).events);
    assert.ok(fast.stats.medianMs <= 50, `seed ${seed}: next-tick reactions measure ${fast.stats.medianMs} ms`);
    if (slow.stats.reactions) assert.ok(slow.stats.medianMs >= 200, `seed ${seed}: 250 ms reactions measure ${slow.stats.medianMs} ms`);
    bots += fast.bot; people += slow.bot;
  }
  assert.ok(bots >= 3, `instant player marked in ${bots} of 4 runs`);
  assert.equal(people, 0);
});
