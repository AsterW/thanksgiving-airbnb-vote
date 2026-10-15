// Hotels in the hunt, added from a Google Maps / Apple Maps link (the add
// box takes those besides Airbnb rooms). The link gives the hotel's name,
// street address and location (worker/lib/maplink.js) — so it lands in the
// right area and on the map — and Google's place data gives photos.
//
// Price: a hotel prices a room per night. Google's hotel search, as a server
// sees it, is a page focused on the hotel searched for, whose price reads
// "$109 for dates Nov 26 – 29, Hyatt House Denver/Downtown" — the average
// nightly rate for those dates. Google ignores plain date params; the dates
// go in its `ts` param (searchState below), so the rate is for the trip's own
// check-in and check-out. Anyone can type the real rate instead
// (POST /api/hotel-rate). Stored as
// rate: { nightly, source: 'google' | 'manual', dates?, checkIn?, checkOut?, at }.
import { j, uid } from '../lib/http.js';
import { tripOf } from '../config/trips.js';
import { locatePlace } from '../lib/maplink.js';
import { placePhotos } from '../food/photos.js';
import { cleanName } from '../users/users.js';
import { getState, updateState } from './state.js';
import { pickArea } from './zones.js';
import { closedError, votingOpen } from './decision.js';

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_PAGE = 4e6; // the price shows up about 2 MB into the page; give up after this

// Words that say nothing about which hotel it is.
const FILLER = new Set(['the', 'a', 'an', 'by', 'and', 'at', 'of', 'hotel']);
const words = s => new Set((String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => !FILLER.has(w)));
// Same hotel? Most of the words shared, both ways (Hyatt House vs Hyatt Place is not).
export function sameHotel(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return false;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both) >= 0.75;
}

const unescape = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// One aria-label: "$79 for dates Nov 24 – 25, Hyatt House Denver/Downtown DEAL 23% less than usual"
export function readRateLabel(label) {
  const m = unescape(label).match(/^\$([\d,]+) for dates ([^,]+), (.+)$/);
  if (!m) return null;
  const nightly = Number(m[1].replace(/,/g, ''));
  if (!(nightly >= 20 && nightly <= 5000)) return null;
  return { nightly, dates: m[2].trim(), hotel: m[3].replace(/\s+(?:(?:GREAT|GOOD)\s+)?DEAL\b.*$/, '').trim() };
}
// Every price label in a piece of the page, in order.
export function rateLabels(html) {
  const out = [];
  for (const m of html.matchAll(/aria-label="(\$[\d,]+ for dates [^"]+)"/g)) { const r = readRateLabel(m[1]); if (r) out.push(r); }
  return out;
}

// Google keeps the hotel search's dates in a base64 protobuf, the `ts` param:
// { 1: 1, 2: {}, 3: { 1: { 3: {} }, 2: { 2: { 1: checkIn, 2: checkOut, 3: nights }, 6: { 2: 0 } },
//   5: { 1: { 7: 'USD' } } } }, a date being { 1: year, 2: month, 3: day }.
const varint = n => { const out = []; while (n > 127) { out.push((n & 127) | 128); n >>>= 7; } out.push(n); return out; };
const pbInt = (f, n) => [...varint(f << 3), ...varint(n)];
const pbMsg = (f, bytes) => [...varint((f << 3) | 2), ...varint(bytes.length), ...bytes];
const pbDate = (f, iso) => { const [y, m, d] = iso.split('-').map(Number); return pbMsg(f, [...pbInt(1, y), ...pbInt(2, m), ...pbInt(3, d)]); };
export function searchState(checkIn, checkOut) {
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
  const usd = [...new TextEncoder().encode('USD')];
  const bytes = [...pbInt(1, 1), ...pbMsg(2, []), ...pbMsg(3, [
    ...pbMsg(1, pbMsg(3, [])),
    ...pbMsg(2, [...pbMsg(2, [...pbDate(1, checkIn), ...pbDate(2, checkOut), ...pbInt(3, nights)]), ...pbMsg(6, pbInt(2, 0))]),
    ...pbMsg(5, pbMsg(1, pbMsg(7, usd))),
  ])];
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Google's average nightly rate for this hotel over the trip's dates, or null.
// The page is large, so it's read as it streams in and dropped once the
// hotel's price has gone by.
export async function googleRate(name, address, trip) {
  const q = encodeURIComponent([name, address].filter(Boolean).join(', '));
  const dated = !!(trip && trip.checkIn && trip.checkOut);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch('https://www.google.com/travel/search?q=' + q + '&hl=en-US&gl=us&curr=USD' + (dated ? '&ts=' + searchState(trip.checkIn, trip.checkOut) : ''),
      { signal: ctrl.signal, headers: { 'User-Agent': DESKTOP_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    if (!r.ok || !r.body) return null;
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '', seen = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      seen += value.length;
      buf += dec.decode(value, { stream: true });
      const cut = buf.lastIndexOf('aria-label="'); // a label may be cut off at the end: keep it for the next piece
      const ready = cut > buf.length - 400 ? buf.slice(0, cut) : buf;
      const hit = rateLabels(ready).find(x => sameHotel(x.hotel, name));
      if (hit) {
        reader.cancel().catch(() => {});
        return { nightly: hit.nightly, dates: hit.dates, source: 'google', ...(dated ? { checkIn: trip.checkIn, checkOut: trip.checkOut } : {}), at: Date.now() };
      }
      buf = buf.slice(ready.length);
      if (seen > MAX_PAGE) { reader.cancel().catch(() => {}); break; }
    }
    return null;
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

// A hotel's identity: Google's place id when the link has one, else name + rounded spot,
// so the same hotel shared through different links lands on one card.
function hotelId(p) {
  if (p.placeId) return 'map:' + p.placeId;
  const raw = p.name.toLowerCase() + '|' + (p.lat != null ? p.lat.toFixed(4) + ',' + p.lng.toFixed(4) : p.url);
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0;
  return 'map:' + h.toString(36);
}
const nightlyOf = v => { const n = Math.round(Number(v)); return n >= 1 && n <= 20000 ? n : null; };

// POST /api/add with a maps link lands here (routes.js).
export async function addHotel(body, env) {
  const trip = tripOf(body.trip);
  if (!votingOpen(trip)) return closedError();
  // Slow work (link, lookups, Google) before reading the list, like Airbnb adds.
  const p = await locatePlace(body.url, trip.zones);
  if (!p.ok) return j({ ok: false, error: '读不出这个地图链接是哪家。在地图里打开那家酒店，点「分享」复制链接再试' });
  const roomId = hotelId(p);
  const pre = await getState(env, trip);
  const preExisting = pre.listings.find(l => l.roomId === roomId);
  if (preExisting) return j({ ok: true, listing: preExisting, deduped: true });
  const typed = nightlyOf(body.nightly);
  const [rate, images, zone] = await Promise.all([
    typed ? { nightly: typed, source: 'manual', at: Date.now() } : googleRate(p.name, p.address, trip),
    placePhotos(p.url).catch(() => []),
    pickArea(trip, pre.listings, p),
  ]);
  const listing = {
    id: uid(), roomId, kind: 'hotel', url: p.url, title: p.name, address: p.address,
    ...(p.lat != null ? { lat: p.lat, lng: p.lng } : {}),
    image: images[0] || '', images, area: zone.area || '', priceUSD: null, rate: rate || null,
    rating: null, reviews: null, note: '', addedBy: cleanName(body.addedBy), createdAt: Date.now(), votes: [],
  };
  const out = await updateState(env, trip, state => {
    const existing = state.listings.find(l => l.roomId === roomId);
    if (existing) return { deduped: true, listing: existing };
    state.listings.unshift(listing);
    return { listing };
  });
  return j({ ok: true, listing: out.listing, ...(out.deduped ? { deduped: true } : {}) });
}

// Type in a hotel's real nightly rate (or clear it with an empty value).
async function handleRate(req, env) {
  let body = {};
  try { body = await req.json() || {}; } catch (e) { /* ignore */ }
  const trip = tripOf(body.trip);
  if (!votingOpen(trip)) return closedError();
  const nightly = nightlyOf(body.nightly);
  if (body.nightly !== '' && body.nightly != null && !nightly) return j({ ok: false, error: '价格要是 1 到 20000 之间的数字' });
  const out = await updateState(env, trip, state => {
    const l = state.listings.find(x => x.id === body.id);
    if (!l || l.kind !== 'hotel') return { error: '酒店不存在' };
    l.rate = nightly ? { nightly, source: 'manual', by: cleanName(body.name), at: Date.now() } : null;
    return { listing: l };
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, listing: out.listing });
}

// Google rates for the trip's dates: hotels with no rate, a rate for other dates
// (older adds got whatever night Google picked), or one older than a day.
// Typed-in rates are left alone. Called from /api/prices (prices.js), which
// writes the results back; returns { [listing id]: rate }.
const RATE_TTL_MS = 24 * 60 * 60 * 1000;
export const rateFresh = (l, trip) => !!(l.rate && (l.rate.source === 'manual'
  || (l.rate.checkIn === trip.checkIn && l.rate.checkOut === trip.checkOut && l.rate.at > Date.now() - RATE_TTL_MS)));
export async function refreshHotelRates(listings, trip, { id, force } = {}) {
  const todo = listings.filter(l => l.kind === 'hotel' && (id ? l.id === id : true) && (force ? l.rate?.source !== 'manual' : !rateFresh(l, trip))
    && !(l.rateTriedAt > Date.now() - 6 * 60 * 60 * 1000 && !force)).slice(0, 4);
  const out = {};
  await Promise.all(todo.map(async l => { out[l.id] = await googleRate(l.title, l.address, trip); }));
  return out; // null for a hotel Google had no price for (so it isn't retried for a while)
}

export const routes = {
  'POST /api/hotel-rate': handleRate,
};
