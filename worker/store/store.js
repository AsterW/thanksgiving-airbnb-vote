// The storekeeper: one Durable Object that owns every mutable document
// (trip listings, food, activities, the ledger, flights, angel, users).
//
// Why this exists: KV has no locks or transactions, and every feature
// used to keep its data in one KV document that handlers read, mutated
// and wrote back. Two people writing in the same second read the same
// snapshot and the later save silently erased the earlier one (measured:
// 12 simultaneous listing votes -> 3 survived). A Durable Object is
// single-threaded, so requests to it are processed one at a time, and
// its storage is strongly consistent — no stale snapshots. Writes go
// through a version check (see lib/store.js): a commit only lands if
// nobody else committed since the caller's read, otherwise the caller
// re-reads and retries. Nothing is ever overwritten blindly.
//
// Documents are stored under the same keys they had in KV. On first
// read of a key the object imports the legacy KV value (if any) and
// serves it from then on, so deploying this needed no data migration
// and no downtime. KV still holds the old copies; they are simply no
// longer read or written (the weather cache stays on KV on purpose —
// it is a cache, losing an update there costs nothing).
//
// One record per document ({ v, doc }) in this object's storage;
// documents here are tens of KB, far under the per-value limit.
export class StoreDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  // The current record for a key, importing the legacy KV value on
  // first sight. Returns { v, doc } or null when nothing exists yet.
  async record(key) {
    const rec = await this.state.storage.get('doc:' + key);
    if (rec) return rec;
    const raw = await this.env.VOTES_KV.get(key);
    if (raw == null) return null;
    let doc;
    try { doc = JSON.parse(raw); } catch (e) { return null; }
    const seeded = { v: 1, doc };
    await this.state.storage.put('doc:' + key, seeded);
    return seeded;
  }

  async fetch(request) {
    let body = {};
    try { body = await request.json(); } catch (e) { /* ignore */ }
    const key = String(body.key || '');
    if (!key) return json({ ok: false, error: 'missing key' });
    const url = new URL(request.url);
    if (url.pathname === '/read') {
      const rec = await this.record(key);
      return json(rec ? { ok: true, found: true, v: rec.v, doc: rec.doc } : { ok: true, found: false, v: 0, doc: null });
    }
    if (url.pathname === '/commit') {
      // Only storage is awaited in here, so the check-and-write runs
      // without another request slipping in between.
      const rec = await this.record(key);
      const cur = rec ? rec.v : 0;
      if (body.base !== cur) return json({ ok: false, conflict: true, v: cur });
      const v = cur + 1;
      await this.state.storage.put('doc:' + key, { v, doc: body.doc });
      return json({ ok: true, v });
    }
    return json({ ok: false, error: 'unknown op' }, 404);
  }
}

const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
