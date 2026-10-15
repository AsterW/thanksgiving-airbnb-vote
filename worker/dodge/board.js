// 鲁班七号躲技能 leaderboard: one Durable Object (/api/dodge/*), each person's
// best survival time, all time. The game runs entirely in the browser; when a
// run ends the page posts how long you survived and that's what counts (only
// the login is checked, so nobody posts under someone else's name). Nothing
// is held between requests, so the object can sleep any time without losing
// a run. Bests live in this object's storage (p:<name>), never in KV.
//   POST /api/dodge/score { name, token, ticks }   -> { ticks, best, newBest, rank, board }
//   GET  /api/dodge/board                          -> { board }
// Times are in ticks: 60 a second.
import { getUsers, sameName, cleanName } from '../users/users.js';
import { j } from '../lib/http.js';

const MAX_TICKS = 10 * 60 * 60; // a run stops counting after 10 minutes

// Records taken off the board by hand, each exactly once ([flag, key]): the
// flag is kept, so a later record of the same person is never touched.
// 2026-10-14: PM's 86.2 s was an autopilot run (bot.js); removed on request.
const REMOVE_ONCE = [['removed:pm:2026-10-14', 'pm']];

export class DodgeBoard {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.best = new Map(); // key -> { name, ticks, runs, at }
    this.loaded = null;
  }
  load() {
    return this.loaded ||= this.state.storage.list({ prefix: 'p:' })
      .then(async m => {
        for (const [k, v] of m) this.best.set(k.slice(2), v);
        for (const [flag, key] of REMOVE_ONCE) {
          if (await this.state.storage.get(flag)) continue;
          const was = this.best.get(key) || null;
          this.best.delete(key);
          await this.state.storage.delete('p:' + key);
          await this.state.storage.put(flag, { at: Date.now(), was });
        }
      });
  }
  top() {
    return [...this.best.values()].sort((a, b) => b.ticks - a.ticks || a.at - b.at).slice(0, 50)
      .map(r => ({ name: r.name, ticks: r.ticks, runs: r.runs, at: r.at }));
  }

  async fetch(request) {
    await this.load();
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/dodge/board') return j({ ok: true, board: this.top() });
    // always read the body (answering without it trips the runtime), and only use it if it's an object
    const parsed = request.method === 'POST' ? await request.json().catch(() => null) : null;
    const body = parsed && typeof parsed === 'object' ? parsed : {};
    if (request.method === 'POST' && path === '/api/dodge/score') return this.score(body);
    // a page from before scores were taken from the browser still calls /start and /finish
    return j({ ok: false, error: '这个版本旧了，刷新一下页面' }, 404);
  }

  async score({ name, token, ticks }) {
    if (!Number.isInteger(ticks) || ticks < 0 || ticks > MAX_TICKS) return j({ ok: false, error: '这局的时间不对，没记上' }, 400);
    const users = await getUsers(this.env);
    const user = users.find(u => sameName(u.name, cleanName(name)));
    if (!user || user.token !== token) return j({ ok: false, error: '先登录再玩' }, 401);
    const key = user.name.toLowerCase(), prev = this.best.get(key);
    const newBest = !prev || ticks > prev.ticks;
    const rec = newBest
      ? { name: user.name, ticks, runs: (prev?.runs || 0) + 1, at: Date.now() }
      : { ...prev, name: user.name, runs: prev.runs + 1 };
    this.best.set(key, rec);
    await this.state.storage.put('p:' + key, rec);
    const board = this.top();
    return j({ ok: true, ticks, best: rec.ticks, newBest, rank: board.findIndex(x => x.name === user.name) + 1, board });
  }
}
