import { HERO } from './sim.js';
import { drawHeroSprite, loadHeroSprite } from './hero-sprite.js';

// Start loading as the Gameroom module opens; the vector puppet remains a fallback.
loadHeroSprite();

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function shape(c, pts, fill, stroke = '#503c32') {
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1.3; c.stroke();
}
function oval(c, x, y, rx, ry, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
}
function metal(c, x, y, w, h, colors) {
  const gradient = c.createLinearGradient(x, y, x + w, y + h);
  colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
  return gradient;
}
function gear(c, x, y, r, angle) {
  c.save(); c.translate(x, y); c.rotate(angle);
  c.strokeStyle = '#d2ae67'; c.lineWidth = 3;
  for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(r - 3, 0); c.lineTo(r + 2, 0); c.stroke(); }
  oval(c, 0, 0, r, r, '#a87941'); oval(c, 0, 0, r - 2, r - 2, '#ead39c'); oval(c, 0, 0, 2, 2, '#554950'); c.restore();
}
function cannon(c, x, y, angle, big) {
  c.save(); c.translate(x, y); c.rotate(angle);
  const length = big ? 37 : 31, height = big ? 22 : 15;
  const bronze = metal(c, 0, -height / 2, length, height, ['#ffe5a0', '#bd7733', '#6f472e']);
  shape(c, [[-6, -height / 2], [length - 7, -height / 2], [length, -height / 3], [length, height / 3], [length - 7, height / 2], [-6, height / 2]], bronze);
  c.strokeStyle = '#7b553c'; c.lineWidth = 1;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(1, -4 + i * 4); c.quadraticCurveTo(12, -7 + i * 4, length - 7, -3 + i * 4); c.stroke(); }
  c.fillStyle = '#e6cf97'; c.fillRect(-3, -height / 2 - 2, 4, height + 4); c.fillRect(length - 8, -height / 2 - 2, 4, height + 4);
  if (big) {
    oval(c, length - 1, 0, 6, 11, '#e7d6a5'); oval(c, length, 0, 4, 8, '#483332'); oval(c, length + 1, 0, 2, 5, '#f4c66b');
    for (const y of [-7, 7]) { oval(c, 17, y, 3, 3, '#3e3032'); oval(c, 17, y, 1.5, 1.5, '#ffe18c'); }
  } else {
    // Dragon-shaped second weapon, with a small open jaw and gold horns.
    shape(c, [[13, -8], [21, -14], [19, -7], [32, -6], [36, 0], [23, -1], [19, 6], [10, 6]], '#c98b40');
    shape(c, [[25, 4], [35, 4], [30, 9], [20, 7]], '#e8be71');
    oval(c, 23, -4, 2, 2, '#fff2aa');
  }
  c.restore();
}

// Layered puppet with front, three-quarter and back views. Coordinates are
// grounded at the collision ring; artwork never changes collision geometry.
export function drawHero(c, h, tick, dead, deathAge = 0) {
  if (drawHeroSprite(c, h, tick, dead, deathAge)) {
    drawHeroTag(c, h, dead);
    return;
  }
  const side = h.fx < 0 ? -1 : 1, back = h.fy < -.35;
  const walking = h.mode && !dead;
  const stride = walking ? Math.sin(tick * .32) : 0;
  const breath = dead ? 0 : Math.sin(tick * .045) * .7;
  const turn = Math.abs(h.fx), faceScale = .83 + (1 - turn) * .17;
  c.save(); c.translate(h.x, h.y);
  oval(c, 2, 4, 33, 11, '#06131966');
  c.strokeStyle = dead ? '#dd877c' : '#64d3d899'; c.lineWidth = 1.6;
  c.beginPath(); c.arc(0, 0, HERO.r, 0, TAU); c.stroke();
  c.save(); c.rotate(Math.atan2(h.fy, h.fx));
  shape(c, [[30, 0], [25, -3], [25, 3]], '#aae9e5', '#aae9e5'); c.restore();
  c.translate(0, -8 + Math.abs(stride) * 2 + breath); c.scale(side, 1);
  if (dead) { c.rotate(clamp(deathAge / 22, 0, 1) * 1.15); c.globalAlpha = .8; }
  const gold = metal(c, -23, -40, 46, 38, ['#f4daa1', '#bd873e', '#78502e']);

  // Back-mounted mechanism, then limbs, torso, arms, hair and face.
  shape(c, [[-24, -43], [13, -47], [21, -17], [-24, -11], [-31, -22]], '#6b4531');
  c.fillStyle = '#b18c53'; c.fillRect(-26, -45, 5, 30);
  for (const sign of [-1, 1]) {
    const lift = sign * stride * 4;
    oval(c, sign * 10, -9, 7, 7, '#654534');
    c.strokeStyle = '#705064'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(sign * 10, -7); c.lineTo(sign * 13, 2 + lift); c.stroke();
    shape(c, [[sign * 12 - 6, -4 + lift], [sign * 12 + 6, -5 + lift], [sign * 12 + 9, 9 + lift], [sign * 12 - 7, 9 + lift]], gold);
    oval(c, sign * 12, 2 + lift, 3, 3, '#654155');
    c.strokeStyle = '#f0ce88'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sign * 12 - 5, 7 + lift); c.lineTo(sign * 12 + 7, 7 + lift); c.stroke();
  }
  // The far arm uses the smaller dragon muzzle.
  c.save(); c.translate(-18, -30); c.rotate(-.15 - stride * .08);
  oval(c, 0, 0, 7, 7, '#c6a16a');
  c.scale(-1, 1); cannon(c, 2, 6, -.15, false); c.restore();
  shape(c, [[-19, -40], [13, -42], [21, -22], [10, -9], [-14, -10], [-23, -24]], gold);
  if (!back) {
    // Carved chest plate, red tassel and shoulder straps.
    shape(c, [[-14, -34], [-2, -28], [12, -36], [10, -23], [0, -18], [-12, -23]], '#f5dc9d');
    oval(c, 0, -25, 4, 5, '#a55c3d');
    c.strokeStyle = '#a53465'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(7, -11, 4 + stride * 2, -7); c.stroke();
  }
  oval(c, 18, -30, 8, 8, '#b78c4d'); gear(c, 18, -30, 5, tick * .025);
  cannon(c, 22, -22, h.fy * .4 + stride * .05, true);

  c.save(); c.translate(turn * 3, -1); c.scale(faceScale, 1);
  const hair = metal(c, -28, -92, 58, 40, ['#777080', '#332d41', '#211f2d']);
  oval(c, 0, -64, 29, 29, hair);
  // Twin dark hair buns, gold end caps and crimson ribbons.
  for (const sign of [-1, 1]) {
    oval(c, sign * 21, -82, 12, 12, '#3b3044');
    oval(c, sign * 22, -84, 10, 7, gold);
    shape(c, [[sign * 27, -79], [sign * 34, -68 + stride], [sign * 27, -72], [sign * 23, -80]], '#b24732');
    c.strokeStyle = '#784f39'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(sign * 22, -84, 7, .2, Math.PI); c.stroke();
  }
  if (back) {
    // The hair shell and centre seam replace the face when walking away.
    c.strokeStyle = '#8a7887'; c.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 7, -89); c.quadraticCurveTo(i * 11, -68, i * 9, -42); c.stroke(); }
    shape(c, [[-25, -58], [0, -50], [25, -58], [20, -39], [-20, -39]], '#342e40');
  } else {
    const skin = metal(c, -22, -78, 44, 44, ['#fff1c9', '#e4dfb3', '#bdbf91']);
    c.fillStyle = skin; c.strokeStyle = '#8a744e'; c.lineWidth = 1.2;
    c.beginPath(); c.roundRect(-23, -78, 46, 42, [14, 14, 17, 17]); c.fill(); c.stroke();
    // Side locks and the arched gold forehead ornament.
    shape(c, [[-27, -76], [-20, -80], [-19, -42], [-25, -37]], hair);
    shape(c, [[22, -79], [29, -72], [24, -38], [20, -43]], hair);
    shape(c, [[-24, -79], [-18, -86], [0, -78], [19, -86], [25, -79], [18, -74], [0, -70], [-19, -74]], gold);
    shape(c, [[-14, -82], [0, -91], [14, -82], [0, -76]], '#e8ddbb', '#bf914c');
    c.strokeStyle = '#8e7450'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -84); c.lineTo(0, -80); c.lineTo(6, -84); c.stroke();
    const blink = !dead && tick % 250 > 244;
    for (const dx of [-10, 10]) {
      if (blink || dead) {
        c.strokeStyle = '#7b4961'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(dx - 6, -54); c.quadraticCurveTo(dx, -51, dx + 6, -55); c.stroke();
      } else {
        oval(c, dx, -55, 7.5, 9, '#fff7de');
        oval(c, dx + turn * 1.5, -55 + h.fy, 5.5, 7, '#9d5868');
        oval(c, dx + turn * 1.5, -56 + h.fy, 3, 5, '#3e3043');
        oval(c, dx + 2, -59, 2, 2.5, '#fffbea');
        c.strokeStyle = '#815360'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(dx, -55, 7.5, 9, 0, Math.PI, TAU); c.stroke();
      }
      shape(c, [[dx - 4, -68], [dx + 4, -65], [dx + 2, -62]], '#a54a65', '#a54a65');
      oval(c, dx * 1.5, -45, 4, 2, '#d08e7977');
    }
    oval(c, 1, -47, 2.5, 3, '#ddc39b');
    c.strokeStyle = '#927e57'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-9, -42); c.quadraticCurveTo(1, -38, 10, -43); c.moveTo(-8, -41); c.lineTo(-7, -35); c.moveTo(8, -41); c.lineTo(9, -35); c.stroke();
  }
  c.restore();
  if (back) {
    shape(c, [[-18, -36], [14, -39], [18, -12], [-16, -9]], '#8f5e38');
    c.strokeStyle = '#d9bc7e'; c.lineWidth = 3; c.strokeRect(-14, -32, 25, 18);
    gear(c, -1, -23, 8, tick * .03);
  }
  c.restore();
  drawHeroTag(c, h, dead);
}

function drawHeroTag(c, h, dead) {
  // Health UI remains screen-aligned and inside the viewport at the top edge.
  const tagY = Math.max(-112, h.y - 136);
  c.save(); c.fillStyle = '#101e29'; c.fillRect(h.x - 34, tagY, 68, 8);
  c.fillStyle = dead ? '#743b38' : '#72cba3'; c.fillRect(h.x - 33, tagY + 1, 66, 6);
  c.strokeStyle = '#193f3b'; c.lineWidth = 1;
  for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(h.x - 33 + i * 13.2, tagY + 1); c.lineTo(h.x - 33 + i * 13.2, tagY + 7); c.stroke(); }
  c.fillStyle = '#a6c9ec'; c.fillRect(h.x - 33, tagY + 10, 66 * (1 - h.cd / HERO.flashCd), 2);
  c.font = '600 16px system-ui, sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#18313a';
  c.strokeText('鲁班七号', h.x, tagY - 6); c.fillStyle = '#f0ecd5'; c.fillText('鲁班七号', h.x, tagY - 6); c.restore();
}
