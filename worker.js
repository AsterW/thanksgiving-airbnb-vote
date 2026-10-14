// Cloudflare Worker: Thanksgiving Denver trip — shared Airbnb shortlist + voting
// Static frontend is served from ./public via [assets]; API routes handled here.
// KV binding: VOTES_KV

// ---- Seed listings (verified 2026-09-30, 10 adults, Nov 25–29, totals incl. fees) ----
// priceUSD here is a 4-night total; the frontend labels listings without
// priceNights as 4 nights for that reason.
// image fields filled from og:image scrape where available; the rest lazy-enrich
// at runtime via /api/enrich.
const SEED = [
  { roomId: '1227535448419064801', url: 'https://www.airbnb.com/rooms/1227535448419064801?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Vista View Cottage', area: '落基山 · Estes Park', priceUSD: 1907, sleeps: 12, bedrooms: 4, beds: 5, bathrooms: 2.5,
    rating: 4.94, reviews: 18, image: 'https://a0.muscache.com/im/pictures/miso/Hosting-1227535448419064801/original/4d15e476-8a5a-4814-8731-a3463dd395b2.png', note: '环绕露台看山景，离公园近' },
  { roomId: '292274', url: 'https://www.airbnb.com/rooms/292274?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Brown Cabin: Charming Mountain House w/Views', area: '落基山 · Estes Park', priceUSD: 2089, sleeps: 12, bedrooms: 4, beds: 7, bathrooms: 2,
    rating: 4.8, reviews: 340, image: 'https://a0.muscache.com/im/pictures/fe7217ff-0b24-438d-880d-b94722c75bf5.jpg?im_w=1200', note: '1931年老木屋，大石壁炉，步行20分钟到公园' },
  { roomId: '8740974', url: 'https://www.airbnb.com/rooms/8740974?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Skyline - Michener House in the Sky', area: '落基山 · Estes Park', priceUSD: 2200, sleeps: 10, bedrooms: 5, beds: 6, bathrooms: 2,
    rating: 4.93, reviews: 131, image: 'https://a0.muscache.com/im/pictures/111377994/8f520b2f_original.jpg', note: '紧邻公园，大厨房+火坑露台' },
  { roomId: '1658870700646985100', url: 'https://www.airbnb.com/rooms/1658870700646985100?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: "Rocky's Riverside Retreat", area: '落基山 · Estes Park', priceUSD: 2402, sleeps: 10, bedrooms: 4, beds: 7, bathrooms: 2,
    rating: 4.67, reviews: 12, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1658870700646985100/original/37d44665-ba6f-4e75-969f-9208f3e4866b.jpeg', note: '临 Fall River，河畔露台+烧烤' },
  { roomId: '724385787075754980', url: 'https://www.airbnb.com/rooms/724385787075754980?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Fall River Oasis · Private Hot Tub · RMNP', area: '落基山 · Estes Park', priceUSD: 2492, sleeps: 10, bedrooms: 4, beds: 5, bathrooms: 2.5,
    rating: 4.73, reviews: 15, image: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-724385787075754980/original/1dca8f7c-ba03-426e-852a-9165d7bf95a9.jpeg', note: '私家6人热水浴缸，全年可用' },
  { roomId: '39392880', url: 'https://www.airbnb.com/rooms/39392880?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Three Bedroom Cabin - Perfect Your Family', area: '落基山 · Estes Park', priceUSD: 2662, sleeps: 10, bedrooms: 3, beds: 5, bathrooms: 2,
    rating: 4.86, reviews: 71, image: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-39392880/original/01137add-633b-45ca-9fdb-84457f67255b.jpeg', note: '私家热水浴缸看山景，烧柴壁炉' },
  { roomId: '1555270180265800861', url: 'https://www.airbnb.com/rooms/1555270180265800861?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Charming Rustic Cozy Casita Near Sand Dunes', area: '大沙丘区域', priceUSD: 907, sleeps: 10, bedrooms: 2, beds: 10, bathrooms: 1,
    rating: 5.0, reviews: 9, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1555270180265800861/original/47c78951-0836-4300-89a9-c5012216b6e2.jpeg', note: '乡村小木屋，烧烤 patio，最便宜' },
  { roomId: '1645317208833417440', url: 'https://www.airbnb.com/rooms/1645317208833417440?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Vintage home with space to entertain', area: '大沙丘区域', priceUSD: 1140, sleeps: 11, bedrooms: 4, beds: 5, bathrooms: 2,
    rating: 5.0, reviews: 3, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1645317208833417440/original/8928aa7c-1af3-4409-8e26-b405ee471428.jpeg', note: '私家6人热水浴缸+台球桌' },
  { roomId: '1460891336891261388', url: 'https://www.airbnb.com/rooms/1460891336891261388?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Celestial Lodge: Stargazing, Pet Friendly & Groups', area: '大沙丘区域', priceUSD: 1228, sleeps: 14, bedrooms: 3, beds: 10, bathrooms: 2,
    rating: 4.73, reviews: 26, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1460891336891261388/original/93e2f782-f070-4ad2-b440-66b97c3525de.png', note: '暗夜观星平台，离沙丘近' },
  { roomId: '51935947', url: 'https://www.airbnb.com/rooms/51935947?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Beautiful Retreat ~ Multi Family w/ Creek Access', area: '大沙丘区域', priceUSD: 1310, sleeps: 13, bedrooms: 5, beds: 10, bathrooms: 2,
    rating: 5.0, reviews: 10, image: 'https://a0.muscache.com/im/pictures/5f090ddb-2bc0-4b1a-bf9f-29b815cc1f34.jpg', note: '小溪+大火坑，Sangre de Cristo 山景' },
];

// ---- Trips: each leg has its own shortlist under its own KV key ----
// nov26 keeps the original 'state:v1' key so the existing list carries over.
const TRIPS = {
  nov25: { kvKey: 'state:nov25:v1', seed: [], checkIn: '2026-11-25', checkOut: '2026-11-26', people: 9 },
  nov26: { kvKey: 'state:v1', seed: SEED, checkIn: '2026-11-26', checkOut: '2026-11-29', people: 14 },
};
const DEFAULT_TRIP = 'nov26'; // requests without a trip (old cached pages) hit the original list
const tripOf = t => TRIPS[t] || TRIPS[DEFAULT_TRIP];

// ---------- helpers ----------
const j = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function getMeta(html, prop) {
  const m = html.match(new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]*content=["\']([^"\']+)["\']', 'i'))
       || html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']' + prop + '["\']', 'i'));
  return m ? m[1] : '';
}
// Listing photos, in Airbnb's gallery order. Skips platform icons and user avatars.
const MAX_IMAGES = 10;
function collectImages(urls, cover) {
  const out = [];
  const seen = new Set();
  for (const raw of [cover, ...urls]) {
    if (!raw || !/^https:\/\/a0\.muscache\.com\/im\/pictures\//.test(raw)) continue;
    if (/AirbnbPlatformAssets|airbnb-platform-assets|\/user\//i.test(raw)) continue;
    const base = raw.split('?')[0];
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(base + '?im_w=720');
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

function numRe(html, re) { const m = html.match(re); return m ? parseFloat(m[1]) : null; }

const SCRAPE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchTextTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: {
      'User-Agent': SCRAPE_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

function parseTitleTag(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  if (!m) return '';
  const t = m[1].split(' - ')[0].trim();
  return (/^airbnb$/i.test(t) || t.length < 4) ? '' : t;
}
function parseRating(s) {
  const m = String(s || '').match(/★\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}
// More robust: Airbnb embeds aggregateRating in JSON-LD, e.g.
// "aggregateRating":{"@type":"AggregateRating","ratingValue":4.88,"ratingCount":"72"}
function parseJsonLd(html) {
  const m = html.match(/"aggregateRating"\s*:\s*\{[^}]*?"ratingValue"\s*:\s*([\d.]+)/);
  const c = html.match(/"aggregateRating"\s*:\s*\{[^}]*?"ratingCount"\s*:\s*"(\d+)"/);
  return { rating: m ? parseFloat(m[1]) : null, reviews: c ? parseInt(c[1], 10) : null };
}

// Direct scrape of the Airbnb page. Returns null when blocked or unparsable.
function parseDirect(html) {
  if (!html || html.length < 20000) return null;
  const ogTitle = getMeta(html, 'og:title');
  let title = parseTitleTag(html);
  if (!title && ogTitle) title = ogTitle.split('·')[0].trim();
  const ld = parseJsonLd(html);
  const rating = parseRating(ogTitle) || parseRating(html) || ld.rating;
  const image = getMeta(html, 'og:image') || getMeta(html, 'twitter:image') || '';
  const bedrooms = numRe(html, /(\d+)\s*bedrooms?/i);
  const bathrooms = numRe(html, /(\d+(?:\.\d+)?)\s*bath(?:s|rooms?)?/i);
  const beds = numRe(html, /(\d+)\s*beds(?![a-z])/i);
  const guests = numRe(html, /(\d+)\s*guests/i);
  if (!title && !image && bedrooms == null) return null;
  const images = collectImages([...html.matchAll(/"baseUrl":"(https:\/\/a0\.muscache\.com\/[^"]+)"/g)].map(m => m[1]), image);
  // Airbnb's (slightly fuzzed) listing location. lat stays null when the page
  // has none, so callers can tell "looked, not found" from "never looked".
  const la = numRe(html, /"latitude":(-?\d+\.\d+)/), lo = numRe(html, /"longitude":(-?\d+\.\d+)/);
  const geo = la != null && lo != null && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  return { ok: true, title, image, images, bedrooms, bathrooms, beds, guests, rating, reviews: ld.reviews,
    lat: geo ? la : null, lng: geo ? lo : null };
}

// Fallback: Airbnb often blocks datacenter IPs, so read the page through
// the jina reader proxy and parse its markdown instead.
async function parseViaReader(url) {
  const roomId = roomIdFrom(url);
  if (!roomId) return null;
  const md = await fetchTextTimeout('https://r.jina.ai/https://www.airbnb.com/rooms/' + roomId, 15000);
  if (!md || md.length < 1000 || md.includes('Failed to goto')) return null;
  const h1 = md.match(/^# (.+)$/m);
  const title = h1 ? h1[1].trim() : '';
  const imgM = md.match(/!\[[^\]]*\]\((https:\/\/a0\.muscache\.com\/[^)]*?\/Hosting-[^)]+?)\)/);
  const image = imgM ? imgM[1] : '';
  if (!title && !image) return null;
  const images = collectImages([...md.matchAll(/!\[[^\]]*\]\((https:\/\/a0\.muscache\.com\/[^)]*?\/Hosting-[^)]+?)\)/g)].map(m => m[1]), image);
  return { ok: true, title,
    image, images,
    bedrooms: numRe(md, /(\d+)\s*bedrooms?/i),
    bathrooms: numRe(md, /(\d+(?:\.\d+)?)\s*baths?/i),
    beds: numRe(md, /(\d+)\s*beds(?![a-z])/i),
    guests: numRe(md, /(\d+)\s*guests/i),
    rating: parseRating(md) };
}

async function fetchListingInfo(url) {
  const roomId = roomIdFrom(url);
  const candidates = [url];
  // Airbnb serves bot-wall interstitials on .com for some egress IPs but
  // serves the real page on .co.uk — try both before falling back.
  if (roomId && !/airbnb\.co\.uk/i.test(url)) {
    candidates.push('https://www.airbnb.co.uk/rooms/' + roomId);
  }
  for (const u of candidates) {
    const html = await fetchTextTimeout(u, 10000);
    const direct = parseDirect(html);
    if (direct) return direct;
  }
  const via = await parseViaReader(url);
  if (via) return via;
  return { ok: false };
}

// ---------- live prices ----------
// Airbnb's listing page fetches its price box from this persisted GraphQL
// query; we call it the same way. If Airbnb rotates the hash or key, price
// lookups fail soft (the last known price stays, marked with its age).
const AIRBNB_API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20';
const BOOKIT_HASH = '8c9165db910115bff8003e61f847ed907c9c51509ba043fa0610853d7c4de080';
const PRICE_TTL_MS = 6 * 60 * 60 * 1000;

async function queryBookIt(roomId, checkIn, checkOut, adults) {
  const variables = {
    id: btoa('DemandStayListing:' + roomId),
    dateRange: { startDate: checkIn, endDate: checkOut },
    guestCounts: { numberOfAdults: adults },
    includePdpMigrationBookItCalendarSheetFragment: false, includePdpMigrationBookItFloatingFooterFragment: false,
    includePdpMigrationBookItNavFragment: false, includePdpMigrationBookItSidebarFragment: true,
    includeGalleryBookItCtaFragment: false, includeOverviewMerchandisingTipsFragment: false,
    includeStaysPdpPriceHeatmapFragment: false, priceHeatmapDateRange: { startDate: checkIn, endDate: checkOut },
    p3ImpressionId: 'p3_0_vote', selectedCancellationPolicyId: null, causeId: null, selectedGuestOptionId: null,
  };
  const url = 'https://www.airbnb.com/api/v3/StaysPdpBookItQuery/' + BOOKIT_HASH
    + '?operationName=StaysPdpBookItQuery&locale=en&currency=USD'
    + '&variables=' + encodeURIComponent(JSON.stringify(variables))
    + '&extensions=' + encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: BOOKIT_HASH } }));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: {
      'X-Airbnb-API-Key': AIRBNB_API_KEY, 'User-Agent': SCRAPE_UA, 'Accept-Language': 'en-US,en;q=0.9', 'Content-Type': 'application/json' } });
    if (!r.ok) return null;
    const bookIt = (await r.json())?.data?.node?.pdpPresentation?.bookIt;
    if (!bookIt) return null;
    const line = bookIt.structuredDisplayPrice?.primaryLine;
    const money = s => { const m = String(s || '').replace(/,/g, '').match(/\$(\d+(?:\.\d+)?)/); return m ? Math.round(Number(m[1])) : null; };
    return {
      available: bookIt.availability?.isAvailable === true,
      reason: bookIt.availability?.unavailabilityReason || null,
      total: line ? money(line.discountedPrice || line.price) : null,
      original: line ? money(line.originalPrice) : null,
    };
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

// Price for the trip's dates and head count. When the group is bigger than
// the listing allows, price it at the listing's max so there's still a number.
async function fetchLivePrice(listing, trip) {
  if (!listing.roomId || !trip.checkIn) return null;
  const nights = Math.round((Date.parse(trip.checkOut) - Date.parse(trip.checkIn)) / 86400000);
  let guests = trip.people;
  let r = await queryBookIt(listing.roomId, trip.checkIn, trip.checkOut, guests);
  if (r && r.reason === 'GUEST' && listing.sleeps && listing.sleeps < guests) {
    guests = listing.sleeps;
    r = await queryBookIt(listing.roomId, trip.checkIn, trip.checkOut, guests);
  }
  if (!r) return null;
  return { ...r, guests, nights, checkIn: trip.checkIn, checkOut: trip.checkOut, at: Date.now() };
}

function roomIdFrom(url) {
  const m = String(url || '').match(/airbnb\.[a-z.]+\/rooms\/(\d+)/i);
  return m ? m[1] : null;
}

async function getState(env, trip) {
  const raw = await env.VOTES_KV.get(trip.kvKey);
  if (raw) {
    const state = JSON.parse(raw);
    // Migrate states saved before splitwise existed.
    if (!Array.isArray(state.listings)) state.listings = [];
    if (!Array.isArray(state.members)) state.members = [];
    if (!Array.isArray(state.expenses)) state.expenses = [];
    return state;
  }
  const state = { listings: trip.seed.map(s => ({ id: uid(), ...s, addedBy: 'Ken', createdAt: Date.now(), votes: [] })), members: [], expenses: [], updatedAt: Date.now() };
  await env.VOTES_KV.put(trip.kvKey, JSON.stringify(state));
  return state;
}
async function saveState(env, trip, state) {
  state.updatedAt = Date.now();
  await env.VOTES_KV.put(trip.kvKey, JSON.stringify(state));
}

// ---------- route handlers ----------
async function handleAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim();
  const roomId = roomIdFrom(url);
  if (!roomId) return j({ ok: false, error: '看起来不是 Airbnb 房源链接（需要形如 airbnb.com/rooms/123… 的链接）' });
  const trip = tripOf(body.trip);
  // Fast-path dedupe check only — do NOT hold this snapshot across the scrape.
  const preState = await getState(env, trip);
  const preExisting = preState.listings.find(l => l.roomId === roomId);
  if (preExisting) return j({ ok: true, listing: preExisting, deduped: true });
  // Scrape first, read state after. Scraping can take up to ~35s
  // (10s direct + 10s .co.uk + 15s reader); holding a pre-scrape snapshot
  // and saving it afterwards would clobber any votes / adds / removes
  // that happened in that window (lost-update bug).
  const info = await fetchListingInfo(url);
  // Re-read fresh state now that the slow work is done, and re-check
  // dedupe: another request may have added this same room meanwhile.
  const state = await getState(env, trip);
  const existing = state.listings.find(l => l.roomId === roomId);
  if (existing) return j({ ok: true, listing: existing, deduped: true });
  const listing = {
    id: uid(), roomId, url,
    title: (info.title || '').slice(0, 120) || '未命名房源',
    image: info.image || '', images: info.images || [], area: '', priceUSD: null,
    ...('lat' in info ? { lat: info.lat, lng: info.lng } : {}),
    sleeps: info.guests || null, bedrooms: info.bedrooms, beds: info.beds, bathrooms: info.bathrooms,
    rating: info.rating || null, reviews: info.reviews || null, note: '', addedBy: '', createdAt: Date.now(), votes: []
  };
  state.listings.unshift(listing);
  await saveState(env, trip, state);
  return j({ ok: true, listing, fetched: info.ok });
}

async function handleAddManual(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim();
  const title = String(body.title || '').trim().slice(0, 120);
  const roomId = roomIdFrom(url);
  if (!roomId || !title) return j({ ok: false, error: '链接和标题是必填的' });
  const trip = tripOf(body.trip);
  const state = await getState(env, trip);
  if (state.listings.find(l => l.roomId === roomId)) return j({ ok: false, error: '这间已经在清单里了' });
  const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
  const listing = { id: uid(), roomId, url, title,
    image: String(body.image || '').trim().slice(0, 500), area: String(body.area || '').slice(0, 40),
    priceUSD: num(body.priceUSD), priceNights: num(body.priceNights), sleeps: num(body.sleeps), bedrooms: num(body.bedrooms),
    beds: num(body.beds), bathrooms: num(body.bathrooms),
    rating: null, reviews: null, note: String(body.note || '').slice(0, 200),
    addedBy: '', createdAt: Date.now(), votes: [] };
  state.listings.unshift(listing);
  await saveState(env, trip, state);
  return j({ ok: true, listing });
}

async function handleVote(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { id, token, name } = body;
  if (!id || !token) return j({ ok: false, error: '缺少参数' });
  const trip = tripOf(body.trip);
  const state = await getState(env, trip);
  const listing = state.listings.find(l => l.id === id);
  if (!listing) return j({ ok: false, error: '房源不存在' });
  listing.votes = (listing.votes || []).filter(v => v.token !== token);
  let voted = false;
  if (name) {
    listing.votes.push({ token: String(token).slice(0, 80), name: String(name).slice(0, 20), at: Date.now() });
    voted = true;
  }
  await saveState(env, trip, state);
  return j({ ok: true, votes: listing.votes, voted });
}

async function handleRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const trip = tripOf(body.trip);
  const state = await getState(env, trip);
  const i = state.listings.findIndex(l => l.id === body.id);
  if (i < 0) return j({ ok: false, error: '房源不存在' });
  state.listings.splice(i, 1);
  await saveState(env, trip, state);
  return j({ ok: true });
}

async function handleEnrich(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const trip = tripOf(body.trip);
  // Peek only to get the URL to scrape — do NOT hold this snapshot
  // across the scrape (see handleAdd: it can take up to ~35s, and
  // saving a stale snapshot would clobber concurrent changes).
  const peekState = await getState(env, trip);
  const peek = peekState.listings.find(l => l.id === body.id);
  if (!peek) return j({ ok: false });
  const info = await fetchListingInfo(peek.url);
  if (!info.ok) return j({ ok: false });
  // Re-read fresh state after scraping and merge onto the live listing.
  // If it was removed while we were scraping, don't resurrect it.
  const state = await getState(env, trip);
  const listing = state.listings.find(l => l.id === body.id);
  if (!listing) return j({ ok: false });
  if ((!listing.title || listing.title === '未命名房源') && info.title) listing.title = info.title.slice(0, 120);
  if (!listing.image && info.image) listing.image = info.image;
  if ((info.images || []).length > (listing.images || []).length) listing.images = info.images;
  if ('lat' in info && listing.lat == null) { listing.lat = info.lat; listing.lng = info.lng; }
  if (listing.bedrooms == null && info.bedrooms != null) listing.bedrooms = info.bedrooms;
  if (listing.bathrooms == null && info.bathrooms != null) listing.bathrooms = info.bathrooms;
  if (listing.beds == null && info.beds != null) listing.beds = info.beds;
  if (listing.sleeps == null && info.guests != null) listing.sleeps = info.guests;
  if (listing.rating == null && info.rating != null) listing.rating = info.rating;
  if (listing.reviews == null && info.reviews != null) listing.reviews = info.reviews;
  await saveState(env, trip, state);
  return j({ ok: true, listing });
}

// ---------- Splitwise: one expense ledger for the whole group ----------
// Money is handled in integer cents to avoid float drift. Each expense is
// split equally among splitAmong; leftover cents go one each to the first
// participants (in listed order) so shares always sum to the exact total.
function computeBalances(expenses) {
  const bal = {};
  for (const e of expenses || []) {
    const cents = Math.round(Number(e.amountCents) || 0);
    const among = (e.splitAmong || []).filter(Boolean);
    if (!cents || !among.length || !e.paidBy) continue;
    bal[e.paidBy] = (bal[e.paidBy] || 0) + cents;
    const base = Math.floor(cents / among.length);
    let rem = cents - base * among.length;
    for (const name of among) {
      const share = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      bal[name] = (bal[name] || 0) - share;
    }
  }
  return bal;
}

// Greedy settle-up: biggest debtor pays biggest creditor first, which
// keeps the number of transfers at or below (people - 1).
function computeSettlements(balances) {
  const debtors = Object.entries(balances || {}).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(balances || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const out = [];
  let di = 0, ci = 0;
  let dLeft = debtors.length ? -debtors[0][1] : 0;
  let cLeft = creditors.length ? creditors[0][1] : 0;
  while (di < debtors.length && ci < creditors.length) {
    const amt = Math.min(dLeft, cLeft);
    if (amt > 0) out.push({ from: debtors[di][0], to: creditors[ci][0], amountCents: amt });
    dLeft -= amt; cLeft -= amt;
    if (dLeft === 0) { di++; if (di < debtors.length) dLeft = -debtors[di][1]; }
    if (cLeft === 0) { ci++; if (ci < creditors.length) cLeft = creditors[ci][1]; }
  }
  return out;
}

function splitView(split) {
  const balances = computeBalances(split.expenses);
  return { expenses: split.expenses, balances, settlements: computeSettlements(balances) };
}
const cleanName = v => String(v || '').trim().slice(0, 20);

// One ledger for the whole group (not per trip); members are the global user list.
const SPLIT_KEY = 'split:v1';
async function getSplit(env) {
  const raw = await env.VOTES_KV.get(SPLIT_KEY);
  if (raw) return JSON.parse(raw);
  // First run: expenses and members used to be kept per trip. Merge the
  // expenses into one ledger and the member names into the user list.
  const expenses = [], names = [];
  for (const key of Object.keys(TRIPS)) {
    const state = await getState(env, TRIPS[key]);
    expenses.push(...state.expenses);
    names.push(...state.members);
  }
  expenses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const users = await addUsers(env, names.concat(...expenses.map(e => [e.paidBy, ...e.splitAmong])));
  for (const e of expenses) {
    e.paidBy = canonName(users, e.paidBy);
    e.splitAmong = [...new Set(e.splitAmong.map(n => canonName(users, n)))];
  }
  const split = { expenses, updatedAt: Date.now() };
  await env.VOTES_KV.put(SPLIT_KEY, JSON.stringify(split));
  return split;
}
async function saveSplit(env, split) {
  split.updatedAt = Date.now();
  await env.VOTES_KV.put(SPLIT_KEY, JSON.stringify(split));
}

// ---------- users ----------
// One global user list shared by both trips, so people pick their name
// from a dropdown instead of typing it again on every device. Each user
// owns the vote token their votes are recorded under; picking an existing
// user on a new device adopts that token, so their votes show as theirs.
const USERS_KEY = 'users:v1';
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

async function getUsers(env) {
  const raw = await env.VOTES_KV.get(USERS_KEY);
  if (raw) return JSON.parse(raw);
  // First run: build the list from everyone who already voted or was added
  // as a splitwise member, reusing the token from their votes.
  const users = [];
  const add = (name, token) => {
    name = cleanName(name);
    if (name && !users.some(u => sameName(u.name, name))) users.push({ name, token: token || uid(), createdAt: Date.now() });
  };
  for (const key of Object.keys(TRIPS)) {
    const state = await getState(env, TRIPS[key]);
    state.listings.forEach(l => (l.votes || []).forEach(v => add(v.name, v.token)));
    state.members.forEach(m => add(m));
  }
  await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  return users;
}
const publicUsers = users => users.map(u => ({ name: u.name, token: u.token }))
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
// The user list's spelling of a name ("ken" -> "Ken"), or the name as given.
const canonName = (users, name) => (users.find(u => sameName(u.name, name)) || { name }).name;

// Add any names that aren't in the user list yet; returns the list.
async function addUsers(env, names) {
  const users = await getUsers(env);
  let changed = false;
  for (const raw of names) {
    const name = cleanName(raw);
    if (name && !users.some(u => sameName(u.name, name))) {
      users.push({ name, token: uid(), createdAt: Date.now() });
      changed = true;
    }
  }
  if (changed) await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  return users;
}

// Log in as an existing name, or create it. Names are unique (case-insensitive).
async function handleLogin(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  const users = await getUsers(env);
  let user = users.find(u => sameName(u.name, name));
  if (!user) {
    const token = String(body.token || '').slice(0, 80) || uid();
    user = { name, token: users.some(u => u.token === token) ? uid() : token, createdAt: Date.now() };
    users.push(user);
    await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  }
  // This device may have voted under its own token before logging in as an
  // existing user: move those votes (same name only) onto the user's token.
  const oldToken = String(body.token || '');
  if (oldToken && oldToken !== user.token) {
    for (const key of Object.keys(TRIPS)) {
      const state = await getState(env, TRIPS[key]);
      let changed = false;
      for (const l of state.listings) {
        const votes = l.votes || [];
        if (!votes.some(v => v.token === oldToken && sameName(v.name || '', user.name))) continue;
        const hasUserVote = votes.some(v => v.token === user.token);
        l.votes = votes.flatMap(v => {
          if (v.token !== oldToken || !sameName(v.name || '', user.name)) return [v];
          return hasUserVote ? [] : [{ ...v, token: user.token }];
        });
        changed = true;
      }
      if (changed) await saveState(env, TRIPS[key], state);
    }
  }
  return j({ ok: true, user: { name: user.name, token: user.token }, users: publicUsers(users) });
}

// Refresh live prices for a trip's listings that are stale (or for one id).
// Airbnb lookups run first; then fresh state is re-read and only the `live`
// field is written, so concurrent votes/adds aren't clobbered.
async function handlePrices(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const trip = tripOf(body.trip);
  const peek = await getState(env, trip);
  const fresh = l => l.live && l.live.at > Date.now() - PRICE_TTL_MS && l.live.checkIn === trip.checkIn && l.live.checkOut === trip.checkOut;
  const todo = peek.listings.filter(l => (body.id ? l.id === body.id : true) && (body.force || !fresh(l))).slice(0, 12);
  const results = {};
  for (let i = 0; i < todo.length; i += 4) { // a few at a time, to be gentle with Airbnb
    await Promise.all(todo.slice(i, i + 4).map(async l => { const p = await fetchLivePrice(l, trip); if (p) results[l.id] = p; }));
  }
  const state = await getState(env, trip);
  let changed = false;
  for (const l of state.listings) if (results[l.id]) { l.live = results[l.id]; changed = true; }
  if (changed) await saveState(env, trip, state);
  return j({ ok: true, updated: Object.keys(results).length, tried: todo.length,
    live: Object.fromEntries(state.listings.filter(l => l.live).map(l => [l.id, l.live])) });
}

async function handleMemberAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  const users = await addUsers(env, [name]);
  return j({ ok: true, users: publicUsers(users) });
}

// Validates the fields of an expense being added or edited.
// Returns { error } or { fields, users }.
async function readExpense(body, env) {
  const cents = Math.round(Number(body.amountUSD) * 100);
  if (!isFinite(cents) || cents <= 0) return { error: '金额要大于 0' };
  let paidBy = cleanName(body.paidBy);
  if (!paidBy) return { error: '请选择付款人' };
  let splitAmong = (Array.isArray(body.splitAmong) ? body.splitAmong : []).map(cleanName).filter(Boolean);
  if (!splitAmong.length) return { error: '至少选一个人分摊' };
  // New names join the user list; known names use its spelling so "ken" and "Ken" share one balance.
  const users = await addUsers(env, [paidBy, ...splitAmong]);
  paidBy = canonName(users, paidBy);
  splitAmong = [...new Set(splitAmong.map(n => canonName(users, n)))];
  const description = String(body.description || '').trim().slice(0, 120) || '未命名支出';
  return { users, fields: { description, amountCents: cents, paidBy, splitAmong } };
}

async function handleExpenseAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  const split = await getSplit(env);
  const expense = { id: uid(), ...fields, createdAt: Date.now() };
  split.expenses.unshift(expense);
  await saveSplit(env, split);
  return j({ ok: true, expense, users: publicUsers(users), ...splitView(split) });
}

// Fix a wrong description, amount, payer or set of people. The expense keeps
// its id and its place in the list.
async function handleExpenseUpdate(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const split = await getSplit(env);
  const expense = split.expenses.find(e => e.id === body.id);
  if (!expense) return j({ ok: false, error: '支出不存在' });
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  Object.assign(expense, fields, { updatedAt: Date.now() });
  await saveSplit(env, split);
  return j({ ok: true, expense, users: publicUsers(users), ...splitView(split) });
}

async function handleExpenseRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const split = await getSplit(env);
  const i = split.expenses.findIndex(e => e.id === body.id);
  if (i < 0) return j({ ok: false, error: '支出不存在' });
  split.expenses.splice(i, 1);
  await saveSplit(env, split);
  return j({ ok: true, ...splitView(split) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/api/state' && request.method === 'GET') {
      // The trip's listings plus the whole group's ledger. members/expenses
      // inside trip state are pre-merge leftovers, kept in KV but not served.
      const { members, expenses, ...state } = await getState(env, tripOf(url.searchParams.get('trip')));
      return j({ ...state, ...splitView(await getSplit(env)) });
    }
    if (p === '/api/split' && request.method === 'GET') return j({ ok: true, ...splitView(await getSplit(env)) });
    if (p === '/api/prices' && request.method === 'POST') return handlePrices(request, env);
    if (p === '/api/users' && request.method === 'GET') return j({ ok: true, users: publicUsers(await getUsers(env)) });
    if (p === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (p === '/api/add' && request.method === 'POST') return handleAdd(request, env);
    if (p === '/api/add-manual' && request.method === 'POST') return handleAddManual(request, env);
    if (p === '/api/vote' && request.method === 'POST') return handleVote(request, env);
    if (p === '/api/remove' && request.method === 'POST') return handleRemove(request, env);
    if (p === '/api/enrich' && request.method === 'POST') return handleEnrich(request, env);
    if (p === '/api/member' && request.method === 'POST') return handleMemberAdd(request, env);
    if (p === '/api/expense' && request.method === 'POST') return handleExpenseAdd(request, env);
    if (p === '/api/expense-update' && request.method === 'POST') return handleExpenseUpdate(request, env);
    if (p === '/api/expense-remove' && request.method === 'POST') return handleExpenseRemove(request, env);
    return env.ASSETS.fetch(request);
  }
};
