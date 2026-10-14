// Worker-side access to the storekeeper Durable Object (worker/store).
// Every feature document lives there under its old KV key; the object
// imports the legacy KV value the first time a key is read.
//
// Writes use optimistic versioning: read a document with its version,
// mutate it, commit against that version. If someone else committed in
// between, the commit is refused and transact() re-reads the fresh
// document and runs the mutation again — so concurrent writes queue up
// instead of overwriting each other. Mutations must therefore be
// re-runnable: pure functions of the document they are handed (do slow
// or external work — scrapes, geocoding — before calling transact).

const stub = env => env.STORE.get(env.STORE.idFromName('main'));

async function call(env, path, payload) {
  const r = await stub(env).fetch('http://store' + path, { method: 'POST', body: JSON.stringify(payload) });
  return r.json();
}

// { doc, v } — doc is null when the key has never existed.
export async function readDoc(env, key) {
  const r = await call(env, '/read', { key });
  return { doc: r.found ? r.doc : null, v: r.v };
}

const commitDoc = (env, key, base, doc) => call(env, '/commit', { key, base, doc });

const jitter = () => new Promise(res => setTimeout(res, 3 + Math.random() * 15));

// Run fn against the current document and commit its result.
// fn(doc|null) returns one of:
//   { result }        — no write needed; transact returns result
//   { doc, result }   — commit doc; on a version conflict, re-read and
//                       run fn again against the fresh document
//   undefined / null  — no write; transact returns undefined
// Retries are generous and jittered: contention here means a handful of
// friends tapping at once, and each retry is a fresh read away.
export async function transact(env, key, fn) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const { doc, v } = await readDoc(env, key);
    const out = await fn(doc);
    if (!out || !('doc' in out)) return out ? out.result : undefined;
    const c = await commitDoc(env, key, v, out.doc);
    if (c.ok) return out.result;
    await jitter();
  }
  throw new Error('store: too many conflicts on ' + key);
}
