import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { newGame, step, HZ, W, H, HERO, DIRS, SKILLS } from '../../../../worker/dodge/sim.js';
import { draw } from './draw.js';

// One run. The simulation steps 60 times a second; every input is stamped
// with the tick it applies to and recorded, so the server can replay it.
// PC: right-click (or hold it) to move, F / D for 闪现 toward the mouse.
// Phone: joystick on the left, 闪现 button on the right.
const dirOf = (dx, dy) => ((Math.round(Math.atan2(dy, dx) / (2 * Math.PI) * DIRS) % DIRS) + DIRS) % DIRS;
const ASPECT = W / H;

export default function DodgeGame({ seed, touch, hold, onGo, onDead, onPause, children }) {
  const wrap = useRef(null), canvas = useRef(null), hud = useRef(null), cdBtn = useRef(null), joyEl = useRef(null);
  const g = useRef(null), events = useRef([]), pending = useRef({}), mouse = useRef(null), joy = useRef(null);
  const [count, setCount] = useState(3); // 3, 2, 1, then go
  const [size, setSize] = useState({ w: 0, h: 0 });
  const doneRef = useRef(false);
  if (!g.current) g.current = newGame(seed);

  // fit a 16:10 arena into whatever space there is
  useLayoutEffect(() => {
    const el = wrap.current;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const w = Math.min(r.width, r.height * ASPECT), h = w / ASPECT;
      setSize({ w: Math.floor(w), h: Math.floor(h) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 3-2-1, then tell the page the run has started
  useEffect(() => {
    if (count <= 0) { onGo?.(); return; }
    if (hold) return;
    const id = setTimeout(() => setCount(c => c - 1), 600);
    return () => clearTimeout(id);
  }, [count, hold]); // eslint-disable-line react-hooks/exhaustive-deps -- onGo is a fresh arrow each render

  // the loop: fixed 60 ticks a second, drawing every frame
  useEffect(() => {
    const c = canvas.current;
    if (!c || !size.w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr);
    const ctx = c.getContext('2d');
    const scale = (size.w * dpr) / W;
    let raf = 0, last = performance.now(), acc = 0;
    const running = count <= 0 && !hold;
    const frame = now => {
      const sim = g.current;
      if (running && !sim.over) {
        acc += Math.min(now - last, 250);
        let n = 0;
        while (acc >= 1000 / HZ && !sim.over && n++ < 8) {
          const p = pending.current, ev = [];
          if (p.move) ev.push([sim.tick, 0, p.move[0], p.move[1]]);
          if (p.dir !== undefined) ev.push([sim.tick, 1, p.dir]);
          if (p.flash !== undefined) ev.push([sim.tick, 2, p.flash]);
          pending.current = {};
          for (const e of ev) events.current.push(e);
          step(sim, ev);
          acc -= 1000 / HZ;
        }
      }
      last = now;
      draw(ctx, sim, scale);
      if (hud.current) hud.current.textContent = '存活 ' + (sim.tick / HZ).toFixed(1) + ' 秒';
      if (cdBtn.current) {
        const left = sim.hero.cd / HERO.flashCd;
        cdBtn.current.style.setProperty('--p', String(left));
        cdBtn.current.dataset.left = left > 0 ? Math.ceil(sim.hero.cd / HZ) : '';
      }
      if (sim.over && !doneRef.current) { doneRef.current = true; onDead(sim, events.current.slice()); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, count, hold]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- inputs ----
  const toArena = e => {
    const r = canvas.current.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(W, (e.clientX - r.left) / r.width * W))), Math.round(Math.max(0, Math.min(H, (e.clientY - r.top) / r.height * H)))];
  };
  const flash = k => { pending.current.flash = k; };
  // PC: right button moves (hold it to keep following the mouse)
  const rightDown = useRef(false);
  const onPointerDown = e => {
    if (touch || e.pointerType === 'touch') return;
    mouse.current = toArena(e);
    if (e.button === 2) { rightDown.current = true; canvas.current.setPointerCapture(e.pointerId); pending.current.move = mouse.current; }
  };
  const onPointerMove = e => {
    if (touch || e.pointerType === 'touch') return;
    mouse.current = toArena(e);
    if (rightDown.current) pending.current.move = mouse.current;
  };
  const onPointerUp = e => { if (e.button === 2) rightDown.current = false; };
  useEffect(() => {
    if (touch) return;
    const key = e => {
      if (e.repeat || !/^[fd]$/i.test(e.key)) return;
      const h = g.current.hero, m = mouse.current;
      flash(m ? dirOf(m[0] - h.x, m[1] - h.y) : -1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [touch]);

  // phone: a floating joystick wherever the left thumb lands
  const joyDown = e => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    joy.current = { id: e.pointerId, x: e.clientX, y: e.clientY, k: -1 };
    paintJoy(0, 0);
  };
  const joyMove = e => {
    const j = joy.current;
    if (!j || j.id !== e.pointerId) return;
    let dx = e.clientX - j.x, dy = e.clientY - j.y;
    const d = Math.sqrt(dx * dx + dy * dy), R = 48;
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    const k = d > 10 ? dirOf(dx, dy) : -1;
    if (k !== j.k) { j.k = k; pending.current.dir = k; }
    paintJoy(dx, dy);
  };
  const joyUp = e => {
    const j = joy.current;
    if (!j || j.id !== e.pointerId) return;
    joy.current = null;
    pending.current.dir = -1;
    paintJoy(null);
  };
  function paintJoy(dx, dy) {
    const el = joyEl.current;
    if (!el) return;
    if (dx === null) { el.hidden = true; return; }
    const r = wrap.current.getBoundingClientRect();
    el.hidden = false;
    el.style.left = (joy.current.x - r.left) + 'px';
    el.style.top = (joy.current.y - r.top) + 'px';
    el.style.setProperty('--kx', dx + 'px'); el.style.setProperty('--ky', dy + 'px');
  }
  const flashTap = e => { e.preventDefault(); flash(joy.current && joy.current.k >= 0 ? joy.current.k : -1); };

  return (
    <div ref={wrap} className="dg-stage">
      <canvas ref={canvas} className="dg-canvas" style={{ width: size.w, height: size.h }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onContextMenu={e => e.preventDefault()} />
      <div className="dg-hud" ref={hud}>存活 0.0 秒</div>
      {!hold && count <= 0 && <button className="dg-pause" onPointerDown={e => { e.preventDefault(); onPause(); }} aria-label="暂停">⏸</button>}
      {touch && <>
        <div className="dg-joyzone" onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp} />
        <div className="dg-joy" ref={joyEl} hidden><div className="dg-knob" /></div>
      </>}
      <button ref={cdBtn} className={'dg-flash' + (touch ? ' big' : '')} onPointerDown={flashTap} aria-label="闪现">闪现{!touch && <small>F</small>}</button>
      {count > 0 && !hold && <div className="dg-count">{count}</div>}
      {children}
    </div>
  );
}

// "被钟馗的钩子打中了"
export const killedBy = by => (by ? `被${SKILLS[by].who}的${SKILLS[by].what}打中了` : '时间到！');
