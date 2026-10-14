// The 斗地主 room: one Durable Object holding three tables. Clients connect
// over a WebSocket (/api/ddz), pick a table to watch, and sit down with their
// login (name + token from the user list). Each viewer gets their own view of
// the table after every change. Points (豆子) are saved in this object's
// storage under p:<name> when a player stands up or disconnects, never per
// hand. The leaderboard is 斗地主's own, separate from Blackjack's chips.
import { getUsers, sameName, cleanName } from '../users/users.js';
import { DdzGame } from './game.js';

export const ROOMS = 3;

export class DdzHall {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.sockets = new Map(); // socket -> { key (seated/queued player, or null), room (1..ROOMS being watched) }
    this.board = new Map();   // saved points by player key
    this.loaded = null; this.sweeper = null;
    this.tables = Array.from({ length: ROOMS }, () => new DdzGame({
      now: () => Date.now(),
      rand: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
      schedule: (fn, ms) => setTimeout(() => { fn(); this.broadcast(); }, ms),
      cancel: t => clearTimeout(t),
      save: s => this.save(s),
    }));
  }
  load() {
    return this.loaded ||= this.state.storage.list({ prefix: 'p:' })
      .then(m => { for (const [k, v] of m) this.board.set(k.slice(2), v); });
  }
  save(s) {
    const rec = { name: s.name, points: s.points, refills: s.refills, games: s.games, wins: s.wins, updatedAt: Date.now() };
    this.board.set(s.key, rec);
    this.state.storage.put('p:' + s.key, rec);
  }
  tableOf(key) { return key ? this.tables.find(t => t.has(key)) : null; }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    await this.load();
    const room = Math.min(ROOMS, Math.max(1, Number(new URL(request.url).searchParams.get('room')) || 1));
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    this.sockets.set(server, { key: null, room });
    server.addEventListener('message', e => this.onMessage(server, e.data));
    server.addEventListener('close', () => this.onClose(server));
    server.addEventListener('error', () => this.onClose(server));
    if (!this.sweeper) this.sweeper = setInterval(() => this.sweep(), 60000);
    this.send(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async onMessage(ws, data) {
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    const info = this.sockets.get(ws);
    if (!info) return;
    let err = null, extra = null;
    if (m.type === 'watch') {
      info.room = Math.min(ROOMS, Math.max(1, Number(m.room) || 1));
    } else if (m.type === 'sit') {
      const users = await getUsers(this.env);
      const user = users.find(u => sameName(u.name, cleanName(m.name)));
      if (!this.sockets.has(ws)) return; // closed while we looked the user up
      if (!user || user.token !== m.token) err = '先登录再坐下';
      else {
        const key = user.name.toLowerCase();
        const room = Math.min(ROOMS, Math.max(1, Number(m.room) || info.room));
        const here = this.tables[room - 1], elsewhere = this.tableOf(key);
        if (elsewhere && elsewhere !== here) elsewhere.leave(key); // one seat per person
        if (info.key && info.key !== key) this.tableOf(info.key)?.leave(info.key); // switched user in this tab
        for (const [other, o] of this.sockets) if (other !== ws && o.key === key) o.key = null; // a newer tab takes the seat
        err = here.sit(key, user.name, this.board.get(key));
        info.room = room;
        info.key = err ? null : key;
      }
    } else if (!info.key) {
      err = '先坐下';
    } else {
      const t = this.tableOf(info.key);
      if (!t) err = '先坐下';
      else if (m.type === 'start') err = t.start(info.key);
      else if (m.type === 'bid') err = t.bidAction(info.key, m.yes);
      else if (m.type === 'play') err = t.play(info.key, m.cards);
      else if (m.type === 'pass') err = t.pass(info.key);
      else if (m.type === 'hint') extra = { hint: t.hint(info.key) || [] };
      else if (m.type === 'auto') t.setAuto(info.key, m.on);
      else if (m.type === 'leave') { t.leave(info.key); info.key = null; }
    }
    if (err || extra) this.send(ws, err ? { error: err } : extra);
    this.broadcast(err || extra ? ws : null);
  }

  onClose(ws) {
    const info = this.sockets.get(ws);
    if (!info) return;
    this.sockets.delete(ws);
    if (info.key && ![...this.sockets.values()].some(o => o.key === info.key)) this.tableOf(info.key)?.disconnect(info.key);
    if (!this.sockets.size) { clearInterval(this.sweeper); this.sweeper = null; }
    this.broadcast();
  }

  sweep() {
    const idle = this.tables.flatMap(t => t.sweepIdle());
    if (!idle.length) return;
    for (const [ws, o] of this.sockets) {
      if (idle.includes(o.key) && !this.tableOf(o.key)) { o.key = null; this.send(ws, { notice: '太久没动，帮你站起来了，豆子已保存' }); }
    }
    this.broadcast();
  }

  lobby() {
    return this.tables.map((t, i) => ({
      room: i + 1, phase: t.phase,
      people: t.seats.filter(s => s && !s.bot).map(s => s.name).concat(t.waitlist.map(w => w.name)),
      bots: t.seats.filter(s => s && s.bot).length,
    }));
  }
  leaderboard() {
    const rows = new Map(this.board);
    for (const t of this.tables) for (const s of t.humans().concat(t.waitlist)) rows.set(s.key, { name: s.name, points: s.points, refills: s.refills, games: s.games, wins: s.wins, seated: true });
    return [...rows.values()].sort((a, b) => b.points - a.points).slice(0, 30);
  }
  send(ws, extra) {
    const info = this.sockets.get(ws);
    if (!info) return;
    const seatedAt = this.tables.findIndex(t => t.has(info.key)) + 1;
    try {
      ws.send(JSON.stringify({ type: 'state', room: info.room, seatedAt, you: info.key,
        table: this.tables[info.room - 1].view(info.key), lobby: this.lobby(), board: this.leaderboard(), ...extra }));
    } catch (e) { /* socket already gone; its close handler cleans up */ }
  }
  broadcast(skip) { for (const ws of this.sockets.keys()) if (ws !== skip) this.send(ws); }
}
