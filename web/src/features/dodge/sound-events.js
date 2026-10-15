import { HERO, HZ, W, headOf } from './sim.js';

// Which sounds the tick that just ran should make. Pure (no Web Audio), so it
// is tested with node; sfx.js plays them. Call right after step(sim), passing
// whether the run was already over before that step.
//   warn-<kind>  a skill shows on the ground (dur: seconds until it goes off)
//   cast-<kind>  it goes off
//   turn-fan     小乔's fan turns back
//   flash        闪现
//   hit          the hit that ends the run
// pan: -1 (left) .. 1 (right), toward where the sound comes from. Several of
// the same skill in one tick make one sound.
const panAt = x => Math.max(-1, Math.min(1, x / W * 2 - 1)) * 0.7;

export function soundEvents(sim, wasOver) {
  if (wasOver) return [];
  const t = sim.tick - 1, out = [], seen = new Set();
  const add = (sound, x, dur) => { if (!seen.has(sound)) { seen.add(sound); out.push({ sound, pan: panAt(x), dur }); } };
  for (const s of sim.skills) {
    if (s.leader === false) continue; // 安琪拉's three fireballs sound as one
    const x = s.kind === 'ice' ? s.x : s.x0;
    if (s.t0 === t) add('warn-' + s.kind, x, s.warn / HZ);
    if (t - s.t0 === s.warn) add('cast-' + s.kind, x);
    if (s.kind === 'fan' && s.back && s.d === s.len) add('turn-fan', headOf(s)[0]);
  }
  if (sim.hero.cd === HERO.flashCd - 1) add('flash', sim.hero.x);
  if (sim.over && sim.by) add('hit', sim.hero.x);
  return out;
}
