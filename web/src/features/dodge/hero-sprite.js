import { HERO } from './sim.js';

// Four columns, two rows: E, SE, S, SW / W, NW, N, NE.
// Baselines measured from the actual alpha silhouette of each generated frame.
const FRAMES = [
  { top: 76, foot: 474 }, { top: 68, foot: 464 },
  { top: 84, foot: 470 }, { top: 74, foot: 474 },
  { top: 48, foot: 432 }, { top: 42, foot: 414 },
  { top: 64, foot: 416 }, { top: 48, foot: 422 },
];
let atlas;
export function loadHeroSprite() {
  if (!atlas && typeof Image !== 'undefined') {
    atlas = new Image(); atlas.src = '/dodge/luban-directions.webp';
  }
  return atlas;
}

export function drawHeroSprite(ctx, h, tick, dead, deathAge) {
  const image = loadHeroSprite();
  if (!image?.complete || !image.naturalWidth) return false;
  const frame = (Math.round(Math.atan2(h.fy, h.fx) / (Math.PI / 4)) + 8) % 8;
  const { top, foot } = FRAMES[frame];
  const sx = (frame % 4) * 384, sy = Math.floor(frame / 4) * 512;
  // Match the height and feet between views, rather than using atlas whitespace.
  const scale = 111 / (foot - top), anchor = 192;
  const stride = h.mode && !dead ? Math.sin(tick * .33) : 0;
  const bob = Math.abs(stride) * 1.7 + (dead ? 0 : Math.sin(tick * .045) * .4);
  ctx.save(); ctx.translate(h.x, h.y);
  ctx.fillStyle = '#04151655'; ctx.beginPath(); ctx.ellipse(1, 3, 29, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dead ? '#dd877c88' : '#79dbed88'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0, 0, HERO.r, 0, Math.PI * 2); ctx.stroke();
  ctx.translate(0, -2 - bob);
  if (dead) {
    ctx.rotate((h.fx < 0 ? -1 : 1) * Math.min(1, deathAge / 22) * 1.2);
    ctx.globalAlpha = .85;
  } else {
    // Slight weight shift; all movement remains visual, independent of hitboxes.
    ctx.rotate(stride * .018);
  }
  ctx.scale(scale, scale);
  if (h.mode && !dead) {
    const split = foot - 94;
    // The legs move separately beneath the upper-body image, with a small overlap
    // to keep the hip seam closed. No texture processing or extra GPU is needed.
    for (let leg = 0; leg < 2; leg++) {
      const lift = Math.max(0, stride * (leg ? 1 : -1)) * 10;
      ctx.drawImage(image, sx + leg * 192, sy + split, 192, foot - split,
        -anchor + leg * 192, split - foot - lift, 192, foot - split);
    }
    ctx.drawImage(image, sx, sy + top, 384, split - top + 5,
      -anchor, top - foot, 384, split - top + 5);
  } else {
    ctx.drawImage(image, sx, sy + top, 384, foot - top, -anchor, top - foot, 384, foot - top);
  }
  ctx.restore();
  return true;
}
