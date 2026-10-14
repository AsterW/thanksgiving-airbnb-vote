// 鲁班七号躲技能 leaderboard: one Durable Object (/api/dodge/*), each person's
// best survival time, all time. Runs are played in the browser; the score is
// worked out here by replaying the run's inputs (sim.js) from a seed this
// object handed out, so a time can't be made up. A run also can't be shorter
// in real time than the time it claims to have survived.
// Bests live in this object's storage (p:<name>), never in KV.
//   POST /api/dodge/start  { name, token }      -> { run, seed }
//   POST /api/dodge/finish { run, events }      -> { ticks, best, newBest, rank, board }
//   GET  /api/dodge/board                       -> { board }
import { getUsers, sameName, cleanName } from '../users/users.js';
import { j } from '../lib/http.js';
import { replay, HZ } from './sim.js';

const RUN_TTL = 30 * 60 * 1000; // an unfinished run is forgotten after 30 minutes

export class DodgeBoard {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.best = new Map(); // key -> { name, ticks, runs, at }
    this.runs = new Map(); // run id -> { key, name, seed, at }
    this.loaded = null;
  }
  load() {
    return this.loaded ||= this.state.storage.list({ prefix: 'p:' })
      .then(m => { for (const [k, v] of m) this.best.set(k.slice(2), v); });
  }
  top() {
    return [...this.best.values()].sort((a, b) => b.ticks - a.ticks || a.at - b.at).slice(0, 50)
      .map(r => ({ name: r.name, ticks: r.ticks, runs: r.runs, at: r.at }));
  }

  async fetch(request) {
    await this.load();
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/dodge/board') return j({ ok: true, board: this.top() });
    if (request.method !== 'POST') return j({ ok: false, error: 'not found' }, 404);
    const body = await request.json().catch(() => ({}));
    if (path === '/api/dodge/start') return this.start(body);
    if (path === '/api/dodge/finish') return this.finish(body);
    return j({ ok: false, error: 'not found' }, 404);
  }

  async start({ name, token }) {
    const users = await getUsers(this.env);
    const user = users.find(u => sameName(u.name, cleanName(name)));
    if (!user || user.token !== token) return j({ ok: false, error: '先登录再开始' }, 401);
    const now = Date.now();
    for (const [id, r] of this.runs) if (now - r.at > RUN_TTL) this.runs.delete(id);
    const run = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    this.runs.set(run, { key: user.name.toLowerCase(), name: user.name, seed, at: now });
    return j({ ok: true, run, seed });
  }

  async finish({ run, events }) {
    const r = this.runs.get(run);
    if (!r) return j({ ok: false, error: '这局没登记上（服务器刚重启过？），再来一局吧' }, 404);
    this.runs.delete(run);
    const out = replay(r.seed, events);
    if (!out) return j({ ok: false, error: '这局的记录不对，没算分' }, 400);
    // 60 ticks a second: you can't have survived longer than the time that has passed (plus a little slack)
    if (out.ticks > ((Date.now() - r.at) / 1000 + 5) * HZ) return j({ ok: false, error: '时间对不上，没算分' }, 400);
    const prev = this.best.get(r.key);
    const newBest = !prev || out.ticks > prev.ticks;
    const rec = newBest
      ? { name: r.name, ticks: out.ticks, runs: (prev?.runs || 0) + 1, at: Date.now() }
      : { ...prev, name: r.name, runs: prev.runs + 1 };
    this.best.set(r.key, rec);
    await this.state.storage.put('p:' + r.key, rec);
    const board = this.top();
    return j({ ok: true, ticks: out.ticks, by: out.by, best: rec.ticks, newBest, rank: board.findIndex(x => x.name === r.name) + 1, board });
  }
}
