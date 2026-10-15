import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, step, SKILLS, HZ, W, H } from './sim.js';
import { soundEvents } from './sound-events.js';
import { SOUND_NAMES } from './sfx.js';

// A game with no random waves, the hero in the middle, and skills placed by hand
// along the top edge so they never hit.
const emptyGame = () => { const g = newGame(1); g.next = Infinity; g.hero.x = W / 2; g.hero.y = H / 2; return g; };
const skill = (kind, values = {}) => {
  const def = SKILLS[kind];
  if (kind === 'ice') return { kind, t0: 0, warn: 5, x: 100, y: 60, r: def.r, live: def.live, ...values };
  if (kind === 'beam') return { kind, t0: 0, warn: 5, x0: 0, y0: 40, dx: 1, dy: 0, r: def.r, live: def.live, len: def.len, ...values };
  return { kind, t0: 0, warn: 5, x0: 0, y0: 40, dx: 1, dy: 0, d: 0, back: false, leader: true, speed: def.speed, r: def.r, len: def.len, ...values };
};
// step n times and collect [tick, sound] pairs
function run(g, n, firstEvents = []) {
  const heard = [];
  for (let i = 0; i < n; i++) {
    const was = g.over;
    step(g, i === 0 ? firstEvents : []);
    for (const e of soundEvents(g, was)) heard.push([g.tick - 1, e.sound, e]);
  }
  return heard;
}

test('every skill has a warning and a cast sound', () => {
  for (const kind of Object.keys(SKILLS)) {
    assert.ok(SOUND_NAMES.includes('warn-' + kind), 'warn-' + kind);
    assert.ok(SOUND_NAMES.includes('cast-' + kind), 'cast-' + kind);
  }
  for (const name of ['turn-fan', 'flash', 'hit', 'count', 'go']) assert.ok(SOUND_NAMES.includes(name), name);
});

test('a skill warns on the tick it appears and sounds once on the tick it goes off', () => {
  for (const kind of Object.keys(SKILLS)) {
    const g = emptyGame();
    g.skills.push(skill(kind));
    const heard = run(g, 20).filter(([, s]) => s !== 'turn-fan');
    assert.deepEqual(heard.map(([t, s]) => [t, s]), [[0, 'warn-' + kind], [5, 'cast-' + kind]], kind);
    assert.equal(g.over, false, kind + ' should not have hit');
  }
});

test('the warning carries how long until the skill goes off, and pans toward it', () => {
  const g = emptyGame();
  g.skills.push(skill('beam', { warn: 48, x0: W }));
  const [[, , e]] = run(g, 1);
  assert.equal(e.sound, 'warn-beam');
  assert.equal(e.dur, 48 / HZ);
  assert.ok(e.pan > 0.6, 'from the right edge');
});

test("安琪拉's three fireballs and same-tick repeats sound once", () => {
  const g = emptyGame();
  g.skills.push(skill('fire'), skill('fire', { leader: false, y0: 50 }), skill('fire', { leader: false, y0: 60 }), skill('hook'), skill('hook', { y0: 30 }));
  const heard = run(g, 8).map(([t, s]) => t + ' ' + s);
  assert.deepEqual(heard, ['0 warn-fire', '0 warn-hook', '5 cast-fire', '5 cast-hook']);
});

test("小乔's fan makes one sound when it turns back", () => {
  const g = emptyGame();
  g.skills.push(skill('fan', { len: 100 }));
  const turns = run(g, 40).filter(([, s]) => s === 'turn-fan');
  assert.equal(turns.length, 1);
  assert.equal(turns[0][0], 5 + Math.ceil(100 / SKILLS.fan.speed) - 1);
});

test('闪现 sounds on the tick it is used, not while cooling down', () => {
  const g = emptyGame();
  const heard = run(g, 30, [[0, 2, 0]]).filter(([, s]) => s === 'flash');
  assert.deepEqual(heard.map(([t]) => t), [0]);
});

test('the hit that ends the run sounds once, and nothing after it', () => {
  const g = emptyGame();
  g.skills.push(skill('hook', { y0: H / 2 })); // straight at the hero
  const heard = run(g, 200);
  assert.equal(g.over, true);
  assert.equal(heard.filter(([, s]) => s === 'hit').length, 1);
  assert.equal(heard.at(-1)[1], 'hit');
  assert.deepEqual(soundEvents(g, true), []);
});
