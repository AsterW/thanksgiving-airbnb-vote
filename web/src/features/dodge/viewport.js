import { W, H } from './sim.js';

// Keep the collision world unchanged, with space around it for scenery and
// the tall sprite at the north edge. The full viewport remains 16:10.
export const VIEW = { left: 128, top: 136, width: W + 256, height: H + 160 };
export function pointInArena(clientX, clientY, rect) {
  return [
    Math.round(Math.max(0, Math.min(W, (clientX - rect.left) / rect.width * VIEW.width - VIEW.left))),
    Math.round(Math.max(0, Math.min(H, (clientY - rect.top) / rect.height * VIEW.height - VIEW.top))),
  ];
}
