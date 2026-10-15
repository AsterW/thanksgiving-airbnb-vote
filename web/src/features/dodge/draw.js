// Canvas terrain and skill effects; the directional puppet lives in hero.js.
// Skill telegraphs are drawn only before release, never during active flight.
import { W, H, HERO, DIR, SKILLS, headOf } from './sim.js';
import { drawHero } from './hero.js';
import { VIEW } from './viewport.js';
import { drawScenery } from './scenery.js';

const TAU = Math.PI * 2;

// Bake the detailed scenery once, keeping mobile frame time for combat.
let ground;
function arena(ctx, g) {
  ctx.fillStyle = '#173c36'; ctx.fillRect(-VIEW.left, -VIEW.top, VIEW.width, VIEW.height);
  if (drawScenery(ctx, g.tick, g.hero)) return;
  if (!ground) {
    ground = document.createElement('canvas'); ground.width = W; ground.height = H;
    terrain(ground.getContext('2d'));
  }
  ctx.drawImage(ground, 0, 0);
}

function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function orb(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function terrain(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#213e3b'); g.addColorStop(.48, '#506554'); g.addColorStop(1, '#193b3a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // River banks and water, crossed by an open stone training platform.
  polygon(ctx, [[0, 570], [960, 0], [1260, 0], [0, 770]], '#263f40');
  polygon(ctx, [[0, 602], [1010, 0], [1200, 0], [0, 740]], '#285d63');
  ctx.strokeStyle = '#6faaa0'; ctx.globalAlpha = .2; ctx.lineWidth = 2;
  for (let i = 0; i < 30; i++) {
    const x = (i * 173) % W, y = 660 - x * .6 + (i % 5) * 13;
    ctx.beginPath(); ctx.ellipse(x, y, 32, 3, -.5, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  polygon(ctx, [[100, 180], [930, 100], [1190, 570], [360, 700]], '#2c4441', '#778578');
  polygon(ctx, [[110, 170], [940, 90], [1200, 555], [370, 685]], '#657367', '#8c9480');
  ctx.save();
  ctx.beginPath(); ctx.moveTo(110, 170); ctx.lineTo(940, 90); ctx.lineTo(1200, 555); ctx.lineTo(370, 685); ctx.closePath(); ctx.clip();
  for (let row = -1; row < 11; row++) for (let col = -1; col < 15; col++) {
    const x = col * 100 + (row % 2) * 50, y = row * 80;
    const tone = (col * 7 + row * 3 + 40) % 5;
    ctx.fillStyle = ['#657267', '#606e64', '#6b776a', '#637267', '#718071'][tone];
    ctx.fillRect(x + 2, y + 2, 96, 76);
    ctx.strokeStyle = '#859081'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, y + 76); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x + 96, y + 4); ctx.stroke();
  }
  ctx.restore();
  // Inlaid crest at the centre; its subdued palette keeps warnings readable.
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1, .7);
  ctx.strokeStyle = '#adac86'; ctx.lineWidth = 3; ctx.globalAlpha = .45;
  for (const r of [104, 119, 155]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
  polygon(ctx, [[0, -92], [24, -25], [88, 0], [24, 25], [0, 92], [-24, 25], [-88, 0], [-24, -25]], '#84917a', '#d4c998');
  ctx.restore();
  // Grass stays at the perimeter: scenery does not imply hidden collision walls.
  for (let i = 0; i < 240; i++) {
    const x = (i * 137.3) % W, y = (i * 83.7) % H;
    if (x > 80 && x < W - 80 && y > 75 && y < H - 75) continue;
    ctx.strokeStyle = ['#41654c', '#5f8058', '#819163'][i % 3]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 8, y - 12, x - 6, y - 22); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 17); ctx.stroke();
  }
  // Low stone plinths frame the play space, with blue and red crystal beacons.
  for (const [x, y, color] of [[42, 110, '#66dcff'], [42, H - 110, '#66dcff'], [W - 42, 110, '#ff9a80'], [W - 42, H - 110, '#ff9a80']]) {
    ctx.fillStyle = '#152e2b'; ctx.beginPath(); ctx.ellipse(x, y + 15, 30, 18, 0, 0, TAU); ctx.fill();
    polygon(ctx, [[x - 25, y], [x, y - 13], [x + 25, y], [x + 25, y + 16], [x, y + 29], [x - 25, y + 16]], '#4a6059', '#9b9e80');
    ctx.shadowColor = color; ctx.shadowBlur = 15;
    polygon(ctx, [[x, y - 36], [x + 11, y - 13], [x, y + 6], [x - 11, y - 13]], color);
    ctx.shadowBlur = 0;
    polygon(ctx, [[x, y - 36], [x + 11, y - 13], [x, y + 6]], '#ffffff66');
  }
  const shade = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 730);
  shade.addColorStop(0, '#071e2500'); shade.addColorStop(1, '#071e25aa');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#b5ab7955'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, W - 24, H - 24);
}

function label(ctx, text, x, y, color) {
  x = Math.max(40, Math.min(W - 40, x)); y = Math.max(28, Math.min(H - 16, y));
  ctx.font = '600 18px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

const COLORS = { hook: '#7ddcff', fire: '#ff9348', ice: '#80dcff', fan: '#ff9bcf', bird: '#ffce65', beam: '#ffe8a0' };

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
  // The simple original telegraph: thin lines for small projectiles, a circle
  // for ice and a wide strip for the large ultimates. It ends at cast time.
  const len = s.len, wide = s.kind === 'beam' || s.kind === 'bird', w = wide ? s.r * 2 : 6;
  ctx.translate(s.x0, s.y0); ctx.rotate(Math.atan2(s.dy, s.dx));
  ctx.globalAlpha = wide ? .12 + .16 * p : .28 + .22 * p;
  ctx.fillStyle = c;
  ctx.fillRect(0, -w / 2, len, w);
  if (wide) {
    ctx.globalAlpha = .65; ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]); ctx.strokeRect(0, -w / 2, len, w);
  }
  ctx.restore();
  // who's casting it, at the wall it comes from
  if (s.leader !== false) {
    label(ctx, SKILLS[s.kind].who, s.x0 + s.dx * 60, s.y0 + s.dy * 60, c);
  }
}

function active(ctx, s, tick) {
  ctx.save();
  if (s.kind === 'ice') {
    const age = tick - s.t0 - s.warn, bloom = Math.min(1, (age + 1) / 3);
    const frost = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    frost.addColorStop(0, '#efffffbb'); frost.addColorStop(.7, '#72c7f099'); frost.addColorStop(1, '#339ce044');
    orb(ctx, s.x, s.y, s.r, frost);
    ctx.strokeStyle = '#b2edff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .96, 0, TAU); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9, r = s.r * (i % 2 ? .7 : .38);
      const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
      const height = (28 + i % 3 * 16) * bloom;
      polygon(ctx, [[x - 10, y], [x - 7, y - height * .7], [x, y - height], [x + 12, y - height * .25], [x + 8, y + 5]], '#b9eaffcc', '#ddf8ff');
      polygon(ctx, [[x, y - height], [x + 12, y - height * .25], [x + 8, y + 5], [x, y]], '#478dc2aa');
    }
  } else if (s.kind === 'beam') {
    ctx.translate(s.x0, s.y0); ctx.rotate(Math.atan2(s.dy, s.dx));
    ctx.shadowColor = '#fde047'; ctx.shadowBlur = 30;
    const surge = .65 + .35 * Math.sin((tick - s.t0 - s.warn) * .5);
    const light = ctx.createLinearGradient(0, -s.r, 0, s.r);
    light.addColorStop(0, '#ed9c2200'); light.addColorStop(.3, '#ffd45bc4'); light.addColorStop(.5, '#fff9da'); light.addColorStop(.7, '#ffd45bc4'); light.addColorStop(1, '#ed9c2200');
    ctx.fillStyle = light; ctx.globalAlpha = surge; ctx.fillRect(0, -s.r, s.len, s.r * 2);
    ctx.strokeStyle = '#fff7c4'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const x = (i * 173 + tick * 16) % s.len; ctx.beginPath(); ctx.moveTo(x, -s.r * .7); ctx.lineTo(x + 30, 0); ctx.lineTo(x, s.r * .7); ctx.stroke(); }
  } else {
    const [x, y] = headOf(s), a = Math.atan2(s.dy, s.dx);
    if (s.kind === 'hook') { // chain back to the wall, and the hook
      ctx.save(); ctx.translate(s.x0, s.y0); ctx.rotate(a);
      const length = Math.hypot(x - s.x0, y - s.y0);
      ctx.lineWidth = 2.5;
      for (let d = 6, i = 0; d < length - 18; d += 12, i++) {
        ctx.strokeStyle = i % 2 ? '#99c8da' : '#426b82';
        ctx.beginPath(); ctx.ellipse(d, 0, 8, i % 2 ? 2 : 4, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
      ctx.translate(x, y); ctx.rotate(a);
      ctx.shadowColor = '#51caff'; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#acdeff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(4, 0); ctx.bezierCurveTo(26, 0, 20, -23, 8, -16); ctx.stroke();
      polygon(ctx, [[8, -16], [2, -6], [16, -11]], '#e0faff');
    } else if (s.kind === 'fire') {
      ctx.translate(x, y); ctx.rotate(a);
      const flame = ctx.createLinearGradient(-s.r * 3, 0, s.r, 0);
      flame.addColorStop(0, '#ff4b1600'); flame.addColorStop(.7, '#ff701de0'); flame.addColorStop(1, '#fff4c4');
      polygon(ctx, [[-s.r * 3, -s.r * .7], [0, -s.r], [s.r, 0], [0, s.r], [-s.r * 3, s.r * .7], [-s.r * 2, 0]], flame);
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 25;
      orb(ctx, 0, 0, s.r * .85, '#ff9b39'); orb(ctx, 3, 0, s.r * .5, '#fff3b5');
      ctx.shadowBlur = 0;
      for (const sign of [-1, 1]) {
        ctx.strokeStyle = '#ffe29a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.r * .6, sign * 4);
        ctx.bezierCurveTo(-s.r, sign * s.r * 1.3, -s.r * 2, sign * (8 + Math.sin(tick * .4) * 5), -s.r * 3.3, sign * 14);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const life = (tick * .07 + i / 6) % 1;
        ctx.globalAlpha = (1 - life) * .8;
        orb(ctx, -s.r - life * 65, Math.sin(i * 2.4) * life * 22, 3 * (1 - life) + 1, '#ffce79');
      }
    } else if (s.kind === 'fan') {
      ctx.translate(x, y); ctx.rotate(tick * 0.18);
      ctx.shadowColor = '#ff89c9'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffd8ec'; ctx.strokeStyle = '#d95191'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.arc(-15, 0, s.r * 1.5, -.95, .95); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#bf7c8c'; ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-15 + Math.cos(i * .3) * s.r * 1.5, Math.sin(i * .3) * s.r * 1.5); ctx.stroke(); }
      orb(ctx, -15, 0, 4, '#ffedb5');
      ctx.shadowBlur = 0;
      for (let i = 0; i < 4; i++) {
        const phase = (tick * .025 + i / 4) % 1;
        ctx.save(); ctx.rotate(i * TAU / 4); ctx.globalAlpha = 1 - phase;
        ctx.fillStyle = '#ffb9df'; ctx.beginPath(); ctx.ellipse(40 + phase * 25, 0, 5, 2.5, .6, 0, TAU); ctx.fill(); ctx.restore();
      }
    } else if (s.kind === 'bird') {
      ctx.translate(x, y); ctx.rotate(a);
      ctx.shadowColor = '#ffbb45'; ctx.shadowBlur = 22;
      const tail = ctx.createLinearGradient(-s.r * 3, 0, s.r, 0);
      tail.addColorStop(0, '#ffb52b00'); tail.addColorStop(.8, '#ffb52b66'); tail.addColorStop(1, '#fff0a9');
      polygon(ctx, [[-s.r * 3, -20], [25, -10], [s.r, 0], [25, 10], [-s.r * 3, 20], [-s.r * 2, 0]], tail);
      for (const sign of [-1, 1]) {
        const flap = Math.sin(tick * .18) * 4;
        polygon(ctx, [[25, 0], [0, sign * 20], [-20, sign * (s.r + flap)], [-35, sign * 48], [-12, sign * 16], [-33, sign * 26], [-22, sign * 6]], '#ffc868', '#ffeab5');
        ctx.strokeStyle = '#fff6d5'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(5 - i * 5, sign * (12 + i * 4)); ctx.lineTo(-18 - i * 4, sign * (25 + i * 6)); ctx.stroke(); }
      }
      polygon(ctx, [[s.r, 0], [22, -9], [8, -6], [-23, 0], [8, 6], [22, 9]], '#fff5c6', '#fff8dc');
    }
  }
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
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 4 * (1 - p);
    ctx.beginPath(); ctx.moveTo(h.blink.x0, h.blink.y0); ctx.lineTo(h.x, h.y); ctx.stroke();
    for (const [x, y] of [[h.blink.x0, h.blink.y0], [h.x, h.y]]) {
      const glow = ctx.createRadialGradient(x, y - 22, 0, x, y - 22, 54);
      glow.addColorStop(0, '#fffde5cc'); glow.addColorStop(.35, '#ffe9a777'); glow.addColorStop(1, '#ffd25600');
      orb(ctx, x, y - 22, 54, glow);
      ctx.beginPath(); ctx.ellipse(x, y, HERO.r * (1 + p), 9 + p * 8, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const angle = i * TAU / 7, r = 12 + p * 35;
        const px = x + Math.cos(angle) * r, py = y - 16 + Math.sin(angle) * r * .6;
        ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px, py - 8 - p * 20); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// scale: canvas pixels per arena unit
export function draw(ctx, g, scale, aim = null, deathAge = 0) {
  ctx.setTransform(scale, 0, 0, scale, VIEW.left * scale, VIEW.top * scale);
  arena(ctx, g);
  for (const s of g.skills) { const age = g.tick - s.t0; if (age < s.warn) warning(ctx, s, age / s.warn); }
  marks(ctx, g);
  for (const s of g.skills) if (g.tick - s.t0 >= s.warn) active(ctx, s, g.tick);
  drawHero(ctx, g.hero, g.tick, g.over, deathAge);
  if (g.over && g.by && deathAge < 27) {
    const p = deathAge / 27, x = g.hero.x, y = g.hero.y;
    ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = COLORS[g.by]; ctx.lineWidth = 4 * (1 - p);
    ctx.beginPath(); ctx.arc(x, y, 20 + p * 65, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, r = 20 + p * (30 + i % 3 * 18);
      orb(ctx, x + Math.cos(a) * r, y - 20 + Math.sin(a) * r + p * p * 30, 3 * (1 - p) + 1, COLORS[g.by]);
    }
    ctx.globalAlpha = Math.max(0, .2 - p); ctx.fillStyle = '#fff0d0'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (aim && !g.over) {
    const h = g.hero, [dx, dy] = aim.k >= 0 ? DIR[aim.k] : [h.fx, h.fy];
    const x = Math.max(HERO.r, Math.min(W - HERO.r, h.x + dx * HERO.flash));
    const y = Math.max(HERO.r, Math.min(H - HERO.r, h.y + dy * HERO.flash));
    ctx.save(); ctx.strokeStyle = aim.cancel ? '#ff8e83' : '#91eaff'; ctx.lineWidth = 3;
    ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(h.x, h.y, HERO.flash, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; ctx.setLineDash([10, 6]); ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, HERO.r, 0, TAU); ctx.stroke();
    label(ctx, aim.cancel ? '松手取消' : '松手闪现 · 拖远取消', h.x, h.y + 55, aim.cancel ? '#ff8e83' : '#b7efff'); ctx.restore();
  }
}
