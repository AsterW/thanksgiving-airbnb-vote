// The 掼蛋 room: one Durable Object (/api/guandan) holding three tables of
// four. Sockets, seats, saving 豆子 and the leaderboard live in the shared
// TableHall; this only says which game it runs and which messages a seated
// player can send.
import { TableHall } from '../games/hall.js';
import { GuandanGame } from './game.js';

export const ROOMS = 3;

const ACTIONS = {
  start: (t, key) => t.start(key),
  play: (t, key, m) => t.play(key, m.cards),
  pass: (t, key) => t.pass(key),
  back: (t, key, m) => t.giveBack(key, String(m.card || '')), // 还贡
  hint: (t, key) => ({ reply: { hint: t.hint(key) || [] } }),
  auto: (t, key, m) => { t.setAuto(key, m.on); },
};

export class GuandanHall extends TableHall {
  constructor(state, env) {
    super(state, env, { Game: GuandanGame, rooms: ROOMS, actions: ACTIONS, idleNotice: '太久没动，帮你站起来了，豆子已保存' });
  }
}
