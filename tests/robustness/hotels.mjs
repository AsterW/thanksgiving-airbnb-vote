// Booking hotels (worker/listings/hotels.js): structured adds from a
// Booking.com link, and the re-pull path — posting the same hotel again
// refreshes its price snapshot without duplicating the card or losing
// votes. Hotels must never be sent to the Airbnb price quote.
// Standalone use: TEST_BASE=http://localhost:8791 node tests/robustness/hotels.mjs
const B = process.env.TEST_BASE || 'http://localhost:8791';
const J = async (m, p, o) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: o === undefined ? undefined : JSON.stringify(o) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* ignore */ }
  return j;
};
let pass = 0, fail = 0;
const ck = (name, cond, extra) => { if (cond) { pass++; console.log('OK  ', name); } else { fail++; console.log('FAIL', name, extra ?? ''); } };
const tag = Date.now().toString(36);
const slug = 'robust-test-hotel-' + tag;
const url = 'https://www.booking.com/hotel/us/' + slug + '.html?checkin=2026-11-26&checkout=2026-11-29';

// ---- validation ----
const notBooking = await J('POST', '/api/add-hotel', { url: 'https://www.airbnb.com/rooms/12345', title: '走错门了' });
ck('non-Booking URL rejected', notBooking.ok === false, JSON.stringify(notBooking));
const noTitle = await J('POST', '/api/add-hotel', { url });
ck('missing title rejected', noTitle.ok === false, JSON.stringify(noTitle));

// ---- a full structured add ----
const made = await J('POST', '/api/add-hotel', {
  url, title: 'Robust Test Hotel', image: 'https://example.com/h.jpg', lat: 39.7453, lng: -104.9942,
  images: ['https://example.com/h.jpg', 'https://example.com/h2.jpg', 'https://example.com/h.jpg', 'https://example.com/h3.jpg'],
  rating: 8.4, reviews: 985, priceUSD: 686, priceNights: 3, note: '3 间房 · 未含税', addedBy: 'HotelTester',
});
ck('hotel created', made.ok === true && made.listing?.kind === 'hotel', JSON.stringify(made).slice(0, 300));
ck('gallery stored deduped, cover is the first photo',
  JSON.stringify(made.listing?.images) === JSON.stringify(['https://example.com/h.jpg', 'https://example.com/h2.jpg', 'https://example.com/h3.jpg']),
  JSON.stringify(made.listing?.images));
ck('roomId is the booking slug', made.listing?.roomId === 'bk:' + slug, made.listing?.roomId);
ck('price snapshot stamped', made.listing?.priceUSD === 686 && !!made.listing?.priceAt, JSON.stringify(made.listing).slice(0, 300));
const id = made.listing?.id;
const st1 = await J('GET', '/api/state');
const inState = (st1.listings || []).filter(l => l.roomId === 'bk:' + slug);
ck('hotel visible in state, exactly once', inState.length === 1 && inState[0].rating === 8.4, String(inState.length));

// ---- vote, then re-pull: price refreshes, card + vote survive ----
const login = await J('POST', '/api/login', { name: 'HotelVoter' + tag, token: 'dev-hotel-' + tag });
const v = await J('POST', '/api/vote', { id, name: login.user?.name, token: login.user?.token });
ck('vote on a hotel works', v.ok === true && v.voted === true, JSON.stringify(v).slice(0, 200));
const repull = await J('POST', '/api/add-hotel', { url, title: 'Robust Test Hotel', priceUSD: 599, priceNights: 3, addedBy: 'HotelTester',
  images: ['https://example.com/n1.jpg', 'https://example.com/n2.jpg'] });
ck('re-pull reports updated', repull.ok === true && repull.updated === true, JSON.stringify(repull).slice(0, 200));
ck('re-pull replaces the gallery and the cover follows',
  JSON.stringify(repull.listing?.images) === JSON.stringify(['https://example.com/n1.jpg', 'https://example.com/n2.jpg']) && repull.listing?.image === 'https://example.com/n1.jpg',
  JSON.stringify(repull.listing?.images));
ck('re-pull keeps the same card', repull.listing?.id === id, repull.listing?.id);
const st2 = await J('GET', '/api/state');
const after = (st2.listings || []).filter(l => l.roomId === 'bk:' + slug);
ck('still exactly one card after re-pull', after.length === 1, String(after.length));
ck('price refreshed by the re-pull', after[0]?.priceUSD === 599, String(after[0]?.priceUSD));
ck('vote survived the re-pull', (after[0]?.votes || []).length === 1, JSON.stringify(after[0]?.votes));

// ---- the Airbnb price puller must leave hotels alone ----
const pr = await J('POST', '/api/prices', { id, force: true });
ck('prices run leaves hotel without a live quote', pr.ok === true && !(pr.live || {})[id], JSON.stringify(pr).slice(0, 200));
const st3 = await J('GET', '/api/state');
const final = (st3.listings || []).find(l => l.id === id);
ck('pulled price not clobbered by prices run', final?.priceUSD === 599 && !final?.live, JSON.stringify(final).slice(0, 200));

console.log(`HOTELS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
