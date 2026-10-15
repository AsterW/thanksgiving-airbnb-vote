import { W, H } from './sim.js';
import { VIEW } from './viewport.js';

let background;
export function loadScenery() {
  if (!background && typeof Image !== 'undefined') {
    background = new Image(); background.src = '/dodge/canyon.webp';
  }
  return background;
}
loadScenery();

// A single prepainted map, plus inexpensive water glints and foot ripples.
export function drawScenery(ctx, tick, hero) {
  const image = loadScenery();
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, -VIEW.left, -VIEW.top, VIEW.width, VIEW.height);
  ctx.save();
  // The rectangular training boundary is subtle but explicit: scenery beyond
  // it never becomes an invisible wall inside the dodge area.
  ctx.strokeStyle = '#d6eac62e'; ctx.lineWidth = 2;
  ctx.setLineDash([12, 15]); ctx.strokeRect(1, 1, W - 2, H - 2); ctx.setLineDash([]);
  for (let i = 0; i < 16; i++) {
    const x = (i * 139 + tick * .15) % (W + 220) - 110;
    const y = 656 - x * .64 + Math.sin(i * 2.1) * 34;
    const shimmer = (Math.sin(tick * .025 + i * 1.8) + 1) / 2;
    ctx.strokeStyle = `rgba(193,245,243,${shimmer * .15})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(x, y, 8 + shimmer * 12, 2, -.5, 0, Math.PI * 1.6); ctx.stroke();
  }
  if (hero.mode && Math.abs(hero.y - (656 - hero.x * .64)) < 72) {
    for (let i = 0; i < 2; i++) {
      const p = (tick / 32 + i / 2) % 1;
      ctx.strokeStyle = `rgba(204,250,246,${(1 - p) * .32})`;
      ctx.beginPath(); ctx.ellipse(hero.x - hero.fx * p * 25, hero.y - hero.fy * p * 25, 8 + p * 25, 3 + p * 10, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
  return true;
}
