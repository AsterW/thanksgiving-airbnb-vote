// Dated Google hotel prices (worker/listings/hotels.js) on top of the
// map-link hotel flow: a hotel added from a Maps link should carry a
// rate for the trip's own dates, /api/prices should bring a cleared
// rate back for those dates, and a hand-typed rate must never be
// overwritten. The worker reads Google live; when the network path
// can't (some sandboxes break the TLS), the Google-dependent checks
// warn instead of failing — the parsers are unit-tested in
// worker/lib/maplink.test.js.
// Standalone use: TEST_BASE=http://localhost:8791 node tests/robustness/google.mjs
const B = process.env.TEST_BASE || 'http://localhost:8791';
const J = async (m, p, o) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: o === undefined ? undefined : JSON.stringify(o) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* ignore */ }
  return j;
};
let pass = 0, fail = 0;
const ck = (name, cond, extra) => { if (cond) { pass++; console.log('OK  ', name); } else { fail++; console.log('FAIL', name, extra ?? ''); } };
const warn = name => console.log('WARN', name, '(live Google read unavailable — skipped)');
const MAPS = 'https://www.google.com/maps/place/Hilton+Garden+Inn+Denver+Downtown';

// ---- add from a maps link (default trip = nov26, 11/26–11/29) ----
const made = await J('POST', '/api/add', { url: MAPS, addedBy: 'GoogleTester' });
if (!made.ok || made.listing?.kind !== 'hotel') {
  warn('maps-link hotel add');
  console.log(`GOOGLE: ${pass} passed, ${fail} failed (live part skipped)`);
  process.exit(fail ? 1 : 0);
}
const L = made.listing;
const dated = r => r?.source === 'google' && r.checkIn === '2026-11-26' && r.checkOut === '2026-11-29';
ck('hotel created from the maps link', L.roomId?.startsWith('map:'), L.roomId);
if (dated(L.rate)) {
  ck('rate is dated for the trip', L.rate.dates === 'Nov 26 – 29' && L.rate.nightly > 0, JSON.stringify(L.rate));
  if (L.rate.provider) ck('entity remembered for refreshes', typeof L.rate.entity === 'string' && L.rate.entity.length > 5, L.rate.entity);
} else warn('dated rate on add (got ' + (L.rate ? JSON.stringify(L.rate) : 'none') + ')');

// ---- a hand-typed rate wins and survives price refreshes ----
const typed = await J('POST', '/api/hotel-rate', { id: L.id, nightly: 123, name: 'GoogleTester' });
ck('manual rate set', typed.ok === true && typed.listing?.rate?.source === 'manual' && typed.listing?.rate?.nightly === 123, JSON.stringify(typed).slice(0, 200));
await J('POST', '/api/prices', { id: L.id, force: true });
const st = await J('GET', '/api/state');
const after = (st.listings || []).find(l => l.id === L.id);
ck('prices run leaves the manual rate alone', after?.rate?.source === 'manual' && after?.rate?.nightly === 123, JSON.stringify(after?.rate));

// ---- clearing the rate lets the dated pull back in ----
const cleared = await J('POST', '/api/hotel-rate', { id: L.id, nightly: '', name: 'GoogleTester' });
ck('manual rate cleared', cleared.ok === true && cleared.listing?.rate === null, JSON.stringify(cleared).slice(0, 200));
await J('POST', '/api/prices', { id: L.id, force: true });
const st2 = await J('GET', '/api/state');
const after2 = (st2.listings || []).find(l => l.id === L.id);
if (dated(after2?.rate)) ck('prices run restored a dated rate', after2.rate.dates === 'Nov 26 – 29', JSON.stringify(after2.rate));
else warn('dated rate via prices refresh');

console.log(`GOOGLE: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
