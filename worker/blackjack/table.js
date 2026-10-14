import { BlackjackGame } from './game.js';
import { cleanName, getUsers, sameName } from '../users/users.js';

// The Durable Object: WebSockets in, game state out. Every client gets the
// whole table after each change. Saved chips live in this object's storage
// under p:<name>.
export class BlackjackTable {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.sockets = new Map(); // socket -> seat key, or null while just watching
    this.board = new Map();   // saved chips by key
    this.loaded = null; this.sweeper = null;
    this.game = new BlackjackGame({
      now: () => Date.now(),
      rand: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
      schedule: (fn, ms) => setTimeout(() => { fn(); this.broadcast(); }, ms),
      cancel: t => clearTimeout(t),
      save: s => this.save(s),
    });
  }
  load() {
    return this.loaded ||= this.state.storage.list({ prefix: 'p:' })
      .then(m => { for (const [k, v] of m) this.board.set(k.slice(2), v); });
  }
  save(s) {
    const rec = { name: s.name, chips: s.chips, refills: s.refills, updatedAt: Date.now() };
    this.board.set(s.key, rec);
    this.state.storage.put('p:' + s.key, rec);
  }
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    await this.load();
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    this.sockets.set(server, null);
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
    let key = this.sockets.get(ws), err = null;
    if (m.type === 'sit') {
      // Only the logged-in user (name + their token from the user list) can sit as themselves.
      const users = await getUsers(this.env);
      const user = users.find(u => sameName(u.name, cleanName(m.name)));
      if (!this.sockets.has(ws)) return; // closed while we looked the user up
      if (!user || user.token !== m.token) err = '先登录再坐下';
      else {
        const k = user.name.toLowerCase();
        if (key && key !== k) this.game.leave(key); // switched to another user in this tab
        for (const [other, ok] of this.sockets) if (ok === k && other !== ws) this.sockets.set(other, null); // a newer tab takes the seat
        err = this.game.sit(k, user.name, this.board.get(k));
        this.sockets.set(ws, err ? null : k);
      }
    } else if (!key) err = '先坐下';
    else if (m.type === 'bet') err = this.game.bet(key, m.amount);
    else if (m.type === 'hit' || m.type === 'stand' || m.type === 'double') err = this.game.act(key, m.type);
    else if (m.type === 'leave') { this.game.leave(key); this.sockets.set(ws, null); }
    if (err) this.send(ws, { error: err });
    this.broadcast(err ? ws : null);
  }
  onClose(ws) {
    if (!this.sockets.has(ws)) return;
    const key = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (key && ![...this.sockets.values()].includes(key)) this.game.disconnect(key);
    if (!this.sockets.size) { clearInterval(this.sweeper); this.sweeper = null; }
    this.broadcast();
  }
  sweep() {
    const idle = this.game.sweepIdle();
    if (!idle.length) return;
    for (const [ws, k] of this.sockets) {
      if (idle.includes(k)) { this.sockets.set(ws, null); this.send(ws, { notice: '太久没下注，帮你站起来了，筹码已保存' }); }
    }
    this.broadcast();
  }
  leaderboard() {
    const rows = new Map(this.board);
    for (const s of this.game.seats) rows.set(s.key, { name: s.name, chips: s.chips, refills: s.refills, seated: true });
    return [...rows.values()].sort((a, b) => b.chips - a.chips).slice(0, 30);
  }
  send(ws, extra) {
    try { ws.send(JSON.stringify({ type: 'state', table: this.game.view(), you: this.sockets.get(ws), board: this.leaderboard(), ...extra })); }
    catch (e) { /* socket already gone; its close handler cleans up */ }
  }
  broadcast(skip) { for (const ws of this.sockets.keys()) if (ws !== skip) this.send(ws); }
}
