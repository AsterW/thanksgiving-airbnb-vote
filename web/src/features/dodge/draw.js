// Drawing the arena on a canvas. All our own simple art (no game assets):
// 鲁班七号 is a little wooden puppet with big eyes, an orange tuft and a
// backpack; every enemy skill shows a warning on the ground first.
import { W, H, HERO, SKILLS, headOf } from '../../../../worker/dodge/sim.js';

const TAU = Math.PI * 2;

function arena(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#1f5f4a'); g.addColorStop(1, '#0d2e27');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 100; x < W; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 100; y < H; y += 100) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // a river across the middle, like the canyon
  ctx.fillStyle = 'rgba(56,189,248,.07)';
  ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.lineTo(W * 0.22, H); ctx.lineTo(W, H * 0.22); ctx.lineTo(W * 0.78, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(250,204,21,.35)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
}

function label(ctx, text, x, y, color) {
  x = Math.max(40, Math.min(W - 40, x)); y = Math.max(28, Math.min(H - 16, y));
  ctx.font = 'bold 26px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

const COLORS = { hook: '#a855f7', fire: '#f97316', ice: '#38bdf8', fan: '#f472b6', bird: '#facc15', beam: '#fde047' };

function warning(ctx, s, p) {
  const c = COLORS[s.kind];
  ctx.save();
  if (s.kind === 'ice') {
    ctx.fillStyle = c; ctx.globalAlpha = 0.12 + 0.25 * p;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * p, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
    ctx.restore();
    label(ctx, SKILLS.ice.who, s.x, s.y - s.r - 10, c);
    return;
  }
  const len = s.kind === 'beam' ? s.len : s.len, w = s.kind === 'beam' || s.kind === 'bird' ? s.r * 2 : 6;
  ctx.translate(s.x0, s.y0); ctx.rotate(Math.atan2(s.dy, s.dx));
  ctx.globalAlpha = s.kind === 'beam' ? 0.18 + 0.3 * p : 0.35 + 0.3 * p;
  ctx.fillStyle = c;
  ctx.fillRect(0, -w / 2, len, w);
  if (s.kind === 'beam' || s.kind === 'bird') { ctx.globalAlpha = 0.9; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.setLineDash([16, 10]); ctx.strokeRect(0, -w / 2, len, w); }
  ctx.restore();
  // who's casting it, at the wall it comes from
  label(ctx, SKILLS[s.kind].who, s.x0 + s.dx * 60, s.y0 + s.dy * 60, c);
}

function active(ctx, s, tick) {
  ctx.save();
  if (s.kind === 'ice') {
    ctx.fillStyle = 'rgba(186,230,253,.75)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * s.r * 0.8, s.y + Math.sin(a) * s.r * 0.8); ctx.stroke(); }
  } else if (s.kind === 'beam') {
    ctx.translate(s.x0, s.y0); ctx.rotate(Math.atan2(s.dy, s.dx));
    ctx.shadowColor = '#fde047'; ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(254,240,138,.9)'; ctx.fillRect(0, -s.r, s.len, s.r * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, -s.r * 0.35, s.len, s.r * 0.7);
  } else {
    const [x, y] = headOf(s), a = Math.atan2(s.dy, s.dx);
    if (s.kind === 'hook') { // chain back to the wall, and the hook
      ctx.strokeStyle = 'rgba(30,27,75,.9)'; ctx.lineWidth = 5; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-4, 0, s.r * 0.7, -1.2, 1.2); ctx.stroke();
    } else if (s.kind === 'fire') {
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 25;
      ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(x, y, s.r * 0.5, 0, TAU); ctx.fill();
    } else if (s.kind === 'fan') {
      ctx.translate(x, y); ctx.rotate(tick * 0.35);
      ctx.fillStyle = '#f472b6';
      for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s.r * 1.25, -0.35, 0.35); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    } else if (s.kind === 'bird') {
      ctx.translate(x, y); ctx.rotate(a);
      ctx.shadowColor = '#facc15'; ctx.shadowBlur = 35;
      ctx.fillStyle = 'rgba(250,204,21,.85)'; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff7ed'; // the arrow-bird: a beak and two wings
      ctx.beginPath(); ctx.moveTo(s.r * 0.9, 0); ctx.lineTo(-s.r * 0.4, -s.r * 0.75); ctx.lineTo(-s.r * 0.1, 0); ctx.lineTo(-s.r * 0.4, s.r * 0.75); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// 鲁班七号, facing (fx, fy)
function luban(ctx, h, tick, dead) {
  const { x, y } = h, side = h.fx < 0 ? -1 : 1, bob = h.mode ? Math.sin(tick * 0.4) * 1.5 : 0;
  ctx.save();
  ctx.translate(x, y + bob);
  if (dead) { ctx.globalAlpha = 0.85; ctx.rotate(side * 0.5); }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 24, 22, 7, 0, 0, TAU); ctx.fill();
  // backpack
  ctx.fillStyle = '#92400e'; ctx.fillRect(-side * 22 - 7, -6, 14, 22);
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.strokeRect(-side * 22 - 7, -6, 14, 22);
  // body
  ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(0, 8, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#ef4444'; ctx.fillRect(-12, -2, 24, 5); // scarf
  // head
  ctx.fillStyle = '#fcd9a8'; ctx.beginPath(); ctx.arc(0, -12, 16, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#b45309'; ctx.stroke();
  ctx.fillStyle = '#f97316'; // orange tuft
  ctx.beginPath(); ctx.moveTo(-10, -25); ctx.quadraticCurveTo(0, -42, 12, -26); ctx.quadraticCurveTo(2, -31, -10, -25); ctx.fill();
  // eyes looking where he's going
  const ex = h.fx * 2.5, ey = h.fy * 2;
  for (const dx of [-6, 6]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(dx, -12, 5, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111827';
    if (dead) { ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx - 3, -15); ctx.lineTo(dx + 3, -9); ctx.moveTo(dx + 3, -15); ctx.lineTo(dx - 3, -9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(dx + ex, -12 + ey, 2.6, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  // name tag and a health bar, like in the game
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 34, y - 62, 68, 9);
  ctx.fillStyle = dead ? '#475569' : '#22c55e'; ctx.fillRect(x - 33, y - 61, dead ? 0 : 66, 7);
  ctx.font = 'bold 18px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText('鲁班七号', x, y - 68);
  ctx.fillStyle = '#fef3c7'; ctx.fillText('鲁班七号', x, y - 68);
  ctx.restore();
}

// The move-to marker (PC right-click) and the 闪现 flash.
function marks(ctx, g) {
  const h = g.hero;
  if (h.mode === 'to') {
    ctx.save(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(h.tx, h.ty, 12, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.tx - 18, h.ty); ctx.lineTo(h.tx + 18, h.ty); ctx.moveTo(h.tx, h.ty - 18); ctx.lineTo(h.tx, h.ty + 18); ctx.stroke();
    ctx.restore();
  }
  if (h.blink && g.tick - h.blink.t < 14) {
    const p = (g.tick - h.blink.t) / 14;
    ctx.save(); ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 10 * (1 - p);
    ctx.beginPath(); ctx.moveTo(h.blink.x0, h.blink.y0); ctx.lineTo(h.x, h.y); ctx.stroke();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(h.blink.x0, h.blink.y0, HERO.r * (1 + p), 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// scale: canvas pixels per arena unit
export function draw(ctx, g, scale) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  arena(ctx);
  for (const s of g.skills) { const age = g.tick - s.t0; if (age < s.warn) warning(ctx, s, age / s.warn); }
  marks(ctx, g);
  for (const s of g.skills) if (g.tick - s.t0 >= s.warn) active(ctx, s, g.tick);
  luban(ctx, g.hero, g.tick, g.over);
}
