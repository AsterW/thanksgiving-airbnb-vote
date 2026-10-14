import { confetti, CONFETTI_COLORS } from '../../lib/confetti.js';
import { reduceMotion } from '../../lib/motion.js';

// 投票成功的庆祝，像收到 offer 一样：投票按钮炸开彩带和爱心 + 两侧礼炮
// （顶部横幅和按钮的弹跳 vote-pop 由调用方管：类名得走 React，直接改 DOM 会被下一次渲染覆盖）
let heartShape = null;
export function celebrateVote(btn) {
  if (reduceMotion) return;
  const r = btn && btn.getBoundingClientRect();
  const origin = r ? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } : { x: 0.5, y: 0.6 };
  heartShape = heartShape || confetti.shapeFromText({ text: '❤️', scalar: 2 });
  confetti({ particleCount: 90, spread: 75, startVelocity: 40, origin, colors: CONFETTI_COLORS });
  confetti({ particleCount: 12, spread: 60, startVelocity: 32, origin, shapes: [heartShape], scalar: 2 });
  const end = Date.now() + 800;
  (function cannons() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: CONFETTI_COLORS });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: CONFETTI_COLORS });
    if (Date.now() < end) requestAnimationFrame(cannons);
  })();
}
