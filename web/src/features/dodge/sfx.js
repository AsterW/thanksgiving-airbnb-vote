import { load, save } from '../../lib/storage.js';
import { HZ, SKILLS } from './sim.js';

// Sound effects, synthesized with Web Audio: no audio files, nothing copied
// from the real game. Each skill has a warning cue (it shows on the ground; the
// charge-up ones last until it goes off) and a cast sound, panned toward where
// it comes from (sound-events.js decides when). Browsers only start audio from
// a tap or key press, so unlock() is called from those.

// ---- building blocks; t is the start time, a = { ctx, bus, noise } ----
function env(a, t, peak, attack, decay) {
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}
function filterOf(a, t, dur, { type = 'lowpass', f0, f1 = f0, q = 1 }) {
  const f = a.ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  return f;
}
// a wobble on a gain (flutter) or a frequency (vibrato)
function lfo(a, t, dur, param, rate, depth) {
  const o = a.ctx.createOscillator(), g = a.ctx.createGain();
  o.frequency.value = rate; g.gain.value = depth;
  o.connect(g).connect(param);
  o.start(t); o.stop(t + dur + 0.05);
}
function tone(a, t, { type = 'sine', f0, f1 = f0, dur, peak, attack = 0.005, filter, vib }) {
  const o = a.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib) lfo(a, t, dur, o.frequency, vib[0], vib[1]);
  const g = env(a, t, peak, attack, dur - attack);
  (filter ? o.connect(filterOf(a, t, dur, filter)) : o).connect(g).connect(a.bus);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(a, t, { dur, peak, attack = 0.01, flutter, ...filter }) {
  const n = a.ctx.createBufferSource();
  n.buffer = a.noise; n.loop = true;
  let g = env(a, t, peak, attack, dur - attack);
  n.connect(filterOf(a, t, dur, filter)).connect(g);
  if (flutter) { // a spinning fan: the whoosh pulses
    const f = a.ctx.createGain();
    f.gain.value = 0.55;
    lfo(a, t, dur, f.gain, flutter, 0.45);
    g = g.connect(f);
  }
  g.connect(a.bus);
  n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
}
const metal = (a, t, f, dur, peak) => [[1, 1], [1.47, 0.6], [2.09, 0.45], [2.76, 0.35], [3.98, 0.2]]
  .forEach(([r, p], i) => tone(a, t, { f0: f * r, dur: dur * (1 - i * 0.12), peak: peak * p, attack: 0.002 }));
const bell = (a, t, f, dur, peak) => [[1, 1], [2, 0.5], [3.01, 0.25]]
  .forEach(([r, p]) => tone(a, t, { f0: f * r, dur, peak: peak * p, attack: 0.003 }));

// ---- the sounds; each returns how long it lasts (seconds) ----
const SOUNDS = {
  // 钟馗 湮灭之锁: a low scrape as the hook takes aim, then the chain flies and rattles
  'warn-hook': (a, t) => {
    noise(a, t, { type: 'bandpass', f0: 400, f1: 900, q: 6, dur: 0.25, peak: 0.15 });
    tone(a, t, { f0: 98, dur: 0.3, peak: 0.12 });
    return 0.3;
  },
  'cast-hook': (a, t) => {
    noise(a, t, { type: 'bandpass', f0: 700, f1: 2600, q: 1.5, dur: 0.32, peak: 0.4 });
    metal(a, t, 420, 0.5, 0.18);
    for (let i = 0; i < 6; i++) { // chain links
      const at = t + 0.05 + i * 0.045, f = 1700 + Math.random() * 400, p = 0.07 * (1 - i / 7);
      tone(a, at, { f0: f, dur: 0.07, peak: p, attack: 0.002 });
      tone(a, at, { f0: f * 1.47, dur: 0.05, peak: p * 0.6, attack: 0.002 });
    }
    return 0.55;
  },
  // 安琪拉 火球术: the fire catches, then three fireballs roar off
  'warn-fire': (a, t) => {
    noise(a, t, { type: 'lowpass', f0: 400, f1: 1600, dur: 0.3, peak: 0.18, attack: 0.08 });
    tone(a, t, { f0: 300, f1: 600, dur: 0.25, peak: 0.08 });
    return 0.3;
  },
  'cast-fire': (a, t) => {
    for (let k = 0; k < 3; k++) noise(a, t + k * 0.035, { type: 'lowpass', f0: 2400, f1: 500, q: 0.7, dur: 0.5, peak: 0.3 });
    tone(a, t, { f0: 110, f1: 45, dur: 0.45, peak: 0.35 });
    for (let k = 0; k < 8; k++) noise(a, t + Math.random() * 0.4, { type: 'highpass', f0: 3000, dur: 0.02, peak: 0.08, attack: 0.002 });
    return 0.55;
  },
  // 王昭君 禁锢寒霜: ice crystals gather while the circle shows, then it freezes with a crack
  'warn-ice': (a, t, { dur = 0.9 } = {}) => {
    [2093, 2637, 3136, 3520, 4186].forEach((f, i) => bell(a, t + i * dur * 0.15, f, 0.35, 0.035));
    noise(a, t, { type: 'highpass', f0: 5000, dur, peak: 0.05, attack: dur * 0.8 });
    return dur + 0.1;
  },
  'cast-ice': (a, t) => {
    noise(a, t, { type: 'highpass', f0: 2500, q: 0.7, dur: 0.18, peak: 0.4, attack: 0.002 });
    [1568, 2349, 3136].forEach(f => bell(a, t, f, 0.6, 0.06));
    tone(a, t, { f0: 140, f1: 60, dur: 0.2, peak: 0.35 });
    return 0.6;
  },
  // 小乔 绽放之舞: a light chime, a spinning whoosh out, and another on the way back
  'warn-fan': (a, t) => {
    tone(a, t, { f0: 1318, dur: 0.15, peak: 0.07 });
    tone(a, t + 0.06, { f0: 1976, dur: 0.18, peak: 0.06 });
    return 0.25;
  },
  'cast-fan': (a, t) => {
    noise(a, t, { type: 'bandpass', f0: 900, f1: 2800, q: 1.2, dur: 0.38, peak: 1.4, attack: 0.04, flutter: 22 });
    return 0.4;
  },
  'turn-fan': (a, t) => {
    noise(a, t, { type: 'bandpass', f0: 2800, f1: 1000, q: 1.2, dur: 0.35, peak: 1, attack: 0.04, flutter: 22 });
    return 0.4;
  },
  // 后羿 灼日之矢: the bow creaks, twangs, and a big burning bird screeches past
  'warn-bird': (a, t, { dur = 0.7 } = {}) => {
    tone(a, t, { type: 'sawtooth', f0: 140, f1: 190, dur: Math.min(0.5, dur), peak: 0.08, attack: 0.1, filter: { f0: 900 } });
    return 0.5;
  },
  'cast-bird': (a, t) => {
    tone(a, t, { type: 'triangle', f0: 196, dur: 0.25, peak: 0.3, attack: 0.002 });
    tone(a, t, { type: 'triangle', f0: 392, dur: 0.15, peak: 0.12, attack: 0.002 });
    noise(a, t, { type: 'lowpass', f0: 1800, f1: 300, dur: 0.9, peak: 0.35, attack: 0.05 });
    tone(a, t + 0.05, { type: 'sawtooth', f0: 1500, f1: 900, dur: 0.35, peak: 0.14, attack: 0.03, filter: { type: 'bandpass', f0: 1400, q: 4 }, vib: [25, 60] });
    return 0.95;
  },
  // 姜子牙 断罪: a hum that charges up until the moment it fires, then the blast
  'warn-beam': (a, t, { dur = 1 } = {}) => {
    tone(a, t, { type: 'sawtooth', f0: 70, f1: 340, dur, peak: 0.1, attack: dur * 0.85, filter: { f0: 300, f1: 2400 }, vib: [16, 6] });
    return dur + 0.05;
  },
  'cast-beam': (a, t) => {
    tone(a, t, { type: 'square', f0: 900, f1: 120, dur: 0.28, peak: 0.16, attack: 0.002, filter: { f0: 3000 } });
    noise(a, t, { type: 'bandpass', f0: 2400, q: 0.8, dur: 0.3, peak: 0.35, attack: 0.002 });
    tone(a, t, { f0: 70, f1: 40, dur: 0.5, peak: 0.35 });
    return 0.5;
  },
  // 闪现: a quick bright zip
  flash: (a, t) => {
    tone(a, t, { f0: 380, f1: 1900, dur: 0.14, peak: 0.22 });
    noise(a, t, { type: 'highpass', f0: 3500, dur: 0.1, peak: 0.15, attack: 0.002 });
    tone(a, t + 0.06, { f0: 2600, dur: 0.2, peak: 0.04 });
    return 0.26;
  },
  // hit: the thud, then three falling notes
  hit: (a, t) => {
    noise(a, t, { type: 'lowpass', f0: 1200, f1: 200, dur: 0.25, peak: 0.5, attack: 0.002 });
    tone(a, t, { f0: 180, f1: 40, dur: 0.35, peak: 0.5, attack: 0.002 });
    [[440, 0.25, 0.3], [349, 0.45, 0.3], [262, 0.65, 0.6]].forEach(([f, at, d]) =>
      tone(a, t + at, { type: 'triangle', f0: f, dur: d, peak: 0.12, attack: 0.01, filter: { f0: 1800 } }));
    return 1.3;
  },
  // 3-2-1, go
  count: (a, t) => { tone(a, t, { f0: 660, dur: 0.12, peak: 0.12 }); return 0.15; },
  go: (a, t) => { tone(a, t, { f0: 990, dur: 0.25, peak: 0.1 }); tone(a, t, { f0: 1320, dur: 0.25, peak: 0.07 }); return 0.3; },
};
export const SOUND_NAMES = Object.keys(SOUNDS);

// Plays one sound into dest (a live context's master, or an offline context
// when testing). Returns how long it lasts.
const noiseOf = new WeakMap();
export function synth(ctx, dest, name, { t = ctx.currentTime, pan = 0, dur } = {}) {
  let buf = noiseOf.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseOf.set(ctx, buf);
  }
  let bus = ctx.createGain();
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; bus.connect(p); p.connect(dest); }
  else bus.connect(dest);
  return SOUNDS[name]({ ctx, bus, noise: buf }, t, dur ? { dur } : undefined);
}
// The master chain: a little headroom, and a compressor so a pile of skills
// in late game doesn't clip.
export function master(ctx) {
  const g = ctx.createGain(), c = ctx.createDynamicsCompressor();
  g.gain.value = 0.8;
  c.threshold.value = -14; c.knee.value = 10; c.ratio.value = 4; c.attack.value = 0.003; c.release.value = 0.2;
  g.connect(c); c.connect(ctx.destination);
  return g;
}

// ---- the live player ----
const KEY = 'dodgeSound';
let ctx = null, out = null, voices = 0, muted = load(KEY) === 'off';
const last = {};
const MAX_VOICES = 12;
const GAP = { hit: 0, count: 0, go: 0 }; // otherwise the same sound at most every 90 ms

export function unlock() {
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try { ctx = new AC(); out = master(ctx); } catch (e) { ctx = null; return; }
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
}
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  save(KEY, m ? 'off' : '');
  if (!m) unlock();
}

export function play(name, opts, force) {
  if ((muted && !force) || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (last[name] ?? -9) < (GAP[name] ?? 0.09)) return;
  if (voices >= MAX_VOICES && name !== 'hit') return;
  last[name] = now; voices++;
  const len = synth(ctx, out, name, { ...opts, t: now + 0.01 });
  setTimeout(() => { voices--; }, len * 1000 + 60);
}

// 试听 on the start screen: the warning, then the cast when it would go off.
// Plays even when muted, since someone asked for it.
export function preview(kind) {
  unlock();
  const warn = SKILLS[kind].warn / HZ;
  const go = () => {
    play('warn-' + kind, { dur: warn }, true);
    setTimeout(() => play('cast-' + kind, undefined, true), warn * 1000);
    if (kind === 'fan') setTimeout(() => play('turn-fan', undefined, true), warn * 1000 + 700);
  };
  // the very first tap may still be starting the audio
  if (ctx && ctx.state !== 'running') ctx.resume().then(go, () => {}); else go();
}
