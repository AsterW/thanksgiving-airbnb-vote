// Dated Google prices for hotels: what a hotel costs for THIS trip's
// dates, from Google Hotels' own provider offers (official site,
// Booking, Expedia, Traveluro…). The reference rate in hotels.js
// (googleRate) reads the search page's headline price, but Google
// picks those dates itself — often a different month entirely. Here
// the hotel's /prices page is fetched with the trip's `googleTs`
// (config/trips.js): a search context a real browser session
// assembled for exactly the trip's dates. Google only honours such
// a token verbatim — hand-edited copies are ignored and the page
// falls back to default dates — so every parse below VALIDATES that
// the offers on the page are dated for the trip before trusting one.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchText(url, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    return r.ok ? await r.text() : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}

const entityPage = id => 'https://www.google.com/travel/hotels/entity/' + id;
const pricesPage = (id, trip) => entityPage(id) + '/prices?hl=en&ts=' + trip.googleTs;
const searchPage = (q, trip) => 'https://www.google.com/travel/search?q=' + encodeURIComponent(q) + '&hl=en&ts=' + trip.googleTs;

// Lowest dated offer on a hotel's /prices page. Offer records look like
//   ["Traveluro",1073209370,"/travel/lodging/clk?pc=…", …,
//    ["$89","$103",88.97,102.98,89,103], …]
// (nightly, total incl. taxes/fees). Returns null unless the page is
// verifiably dated for the trip AND carries parseable offers.
export function parseGoogleOffers(html, trip) {
  if (!html || !html.includes(`["${trip.checkIn}","${trip.checkOut}"`)) return null;
  const best = new Map();
  for (const m of html.matchAll(/\["([^"]{1,40})",\d{6,},"\/travel\/lodging\/clk\?pc/g)) {
    const seg = html.slice(m.index, m.index + 2600);
    const pb = seg.match(/\["\$(\d[\d,]*)","\$(\d[\d,]*)",([\d.]+),([\d.]+),(\d+),(\d+)\]/);
    if (!pb) continue;
    const o = { provider: m[1], nightly: +pb[5], total: +pb[6] };
    if (!best.has(o.provider) || o.nightly < best.get(o.provider).nightly) best.set(o.provider, o);
  }
  if (!best.size) return null;
  const list = [...best.values()].sort((a, b) => a.nightly - b.nightly || a.total - b.total);
  return { nightly: list[0].nightly, total: list[0].total, provider: list[0].provider, offers: list.length };
}

// Same-hotel word overlap (mirrors sameHotel in hotels.js; kept local
// so this module stays import-cycle-free).
const FILLER = new Set(['the', 'a', 'an', 'by', 'and', 'at', 'of', 'hotel']);
const wordSet = s => new Set((String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => !FILLER.has(w)));
function nameMatches(label, name) {
  const A = wordSet(label), B = wordSet(name);
  if (!A.size || !B.size) return false;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both) >= 0.75;
}

// The hotel name a card label refers to: the part after the last ", "
// ("$89 for dates Nov 25 – 26, <Name>", "4.3 out of 5 stars from 1,942
// reviews, <Name>", "Prices starting from $74, <Name>"), minus any
// trailing deal shout.
const labelHotel = label => label
  .slice(label.lastIndexOf(', ') + 2)
  .replace(/\s+(?:(?:GREAT|GOOD)\s+)?DEAL\b.*$/, '')
  .trim();

// A hotel's travel entity id, from a search page's card links.
export function findEntityInSearch(html, name) {
  if (!html || !name) return null;
  for (const m of html.matchAll(/aria-label="([^"]*)"[^>]*href="\/travel\/hotels\/entity\/([A-Za-z0-9_-]+)"/g)) {
    if (nameMatches(labelHotel(m[1]), name)) return m[2];
  }
  return null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "Nov 25 – 26" / "Nov 26 – 29" — the same shape Google's own labels use.
export function datesLabel(trip) {
  const a = trip.checkIn.split('-'), b = trip.checkOut.split('-');
  const left = MONTHS[+a[1] - 1] + ' ' + (+a[2]);
  return +a[1] === +b[1] ? `${left} – ${+b[2]}` : `${left} – ${MONTHS[+b[1] - 1]} ${+b[2]}`;
}

// The dated rate for one hotel: { nightly (per room, taxes incl.),
// total (per room for the stay), provider, entity, dates, at } or
// null when Google can't be read or won't date the page. `entity`
// may be passed in (stored on the listing at add time) to skip the
// name search.
export async function fetchDatedRateForHotel({ name, entity }, trip) {
  if (!trip.googleTs || (!name && !entity)) return null;
  let ent = entity || null;
  if (!ent) {
    const s = await fetchText(searchPage(name, trip));
    ent = s ? findEntityInSearch(s, name) : null;
    if (!ent) return null;
  }
  const html = await fetchText(pricesPage(ent, trip));
  const o = parseGoogleOffers(html, trip);
  if (!o) return null;
  const nights = Math.round((Date.parse(trip.checkOut) - Date.parse(trip.checkIn)) / 86400000);
  return {
    nightly: Math.round(o.total / nights), total: o.total, provider: o.provider,
    entity: ent, dates: datesLabel(trip), checkIn: trip.checkIn, checkOut: trip.checkOut,
    at: Date.now(),
  };
}
