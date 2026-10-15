import { newGame, step, HZ, DIRS, MAX_TICKS } from './sim.js';

// Checking a run, and watching it again. The same seed and inputs always play
// out the same way (sim.js), so the server replays what the browser recorded
// and its own result is the score; a saved best run plays back the same way.
//
// The replay also measures how fast the player gets out of danger, for the 🤖
// mark. Each time new skills appear, a "ghost" hero carries on from where the
// real one is with no new input; if those skills would hit it, the player is
// in danger. Every tick after that the ghost is tried again from the real
// hero's state, and the first tick it would be missed is when the player got
// out. Moving about for other reasons rarely gets you out by chance, so this
// is a reaction to that danger. A person needs around 200 ms (12 ticks) to
// see a warning and change course; a program can do it on the next tick. A
// run is marked when, over enough dangers, the typical escape is faster than
// people manage (BOT). It flags, it doesn't refuse: a bot that waits like a
// person gets through, which is what watching the replay is for.

export const MAX_EVENTS = 80000;
export const BOT = { minDangers: 15, medianTicks: 8 }; // median escape ≤ 8 ticks (133 ms) over ≥ 15 dangers
const HORIZON = 240; // ticks a ghost is followed at most
const GIVE_UP = 90;  // a danger not escaped within this many ticks isn't timed

// Format check of a recorded input list: an error code, or null when fine.
export function badEvents(events) {
  if (!Array.isArray(events) || events.length > MAX_EVENTS) return 'events';
  let last = 0;
  for (const e of events) {
    if (!Array.isArray(e)) return 'event';
    const [t, type, a, b] = e;
    if (!Number.isInteger(t) || t < last || t > MAX_TICKS) return 'tick';
    last = t;
    if (type === 0) {
      if (e.length !== 4 || !Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 5000 || Math.abs(b) > 5000) return 'move';
    } else if (type === 1 || type === 2) {
      if (e.length !== 3 || !Number.isInteger(a) || a < -1 || a >= DIRS) return 'dir';
    } else return 'type';
  }
  return null;
}

// Would the skills that appeared on tick t0 hit the hero if nothing new were
// pressed from here on? (Only those skills; the hero carries on as it is.)
function inDanger(g, t0) {
  const ghost = { tick: g.tick, over: false, by: null, rand: () => 0, next: Infinity,
    hero: { ...g.hero, blink: null }, skills: g.skills.filter(s => s.t0 === t0).map(s => ({ ...s })) };
  for (let n = 0; !ghost.over && ghost.skills.length && n < HORIZON; n++) step(ghost, []);
  return ghost.over && !!ghost.by;
}

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : null; };

// Replays a run: { ticks, by, stats: { dangers, reactions, medianMs }, bot }.
// Inputs after the run ended are ignored.
export function replay(seed, events, { bot = BOT } = {}) {
  const g = newGame(seed), open = [], reactions = [];
  let i = 0, dangers = 0;
  while (!g.over) {
    const ev = [];
    while (i < events.length && events[i][0] <= g.tick) { if (events[i][0] === g.tick) ev.push(events[i]); i++; }
    step(g, ev);
    // dangers already seen: is the hero out of them yet?
    for (let j = open.length - 1; j >= 0; j--) {
      const t0 = open[j], k = g.tick - 1 - t0;
      if (g.over || k > GIVE_UP) open.splice(j, 1);
      else if (!inDanger(g, t0)) { reactions.push(k); open.splice(j, 1); }
    }
    // skills that just appeared: would they hit a hero who does nothing new?
    const t0 = g.tick - 1;
    if (!g.over && g.skills.some(s => s.t0 === t0) && inDanger(g, t0)) { dangers++; open.push(t0); }
  }
  const mid = median(reactions);
  return {
    ticks: g.tick, by: g.by,
    stats: { dangers, reactions: reactions.length, medianMs: mid === null ? null : Math.round(mid * 1000 / HZ) },
    bot: reactions.length >= bot.minDangers && mid <= bot.medianTicks,
  };
}
