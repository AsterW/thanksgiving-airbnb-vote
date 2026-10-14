// Listing routes: the trip's shortlist, adding (scraped or manual), voting,
// removing, and filling in details the first scrape missed.
import { j, uid } from '../lib/http.js';
import { tripOf } from '../config/trips.js';
import { fetchListingInfo, roomIdFrom } from './scrape.js';
import { getState, saveState } from './state.js';
import { handlePrices } from './prices.js';
import { needsArea, pickArea, routes as zoneRoutes } from './zones.js';
import { getSplit } from '../split/store.js';
import { splitView } from '../split/ledger.js';

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
  // Pick its area (may look up the town name) before re-reading state, for the same reason.
  const { area } = await pickArea(trip, preState.listings, { lat: info.lat, lng: info.lng });
  // Re-read fresh state now that the slow work is done, and re-check
  // dedupe: another request may have added this same room meanwhile.
  const state = await getState(env, trip);
  const existing = state.listings.find(l => l.roomId === roomId);
  if (existing) return j({ ok: true, listing: existing, deduped: true });
  const listing = {
    id: uid(), roomId, url,
    title: (info.title || '').slice(0, 120) || '未命名房源',
    image: info.image || '', images: info.images || [], area: area || '', priceUSD: null,
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
  const located = { ...peek, lat: peek.lat ?? info.lat, lng: peek.lng ?? info.lng };
  const { area } = needsArea(located) ? await pickArea(trip, peekState.listings, located) : { area: null };
  // Re-read fresh state after scraping and merge onto the live listing.
  // If it was removed while we were scraping, don't resurrect it.
  const state = await getState(env, trip);
  const listing = state.listings.find(l => l.id === body.id);
  if (!listing) return j({ ok: false });
  if ((!listing.title || listing.title === '未命名房源') && info.title) listing.title = info.title.slice(0, 120);
  if (!listing.image && info.image) listing.image = info.image;
  if ((info.images || []).length > (listing.images || []).length) listing.images = info.images;
  if ('lat' in info && listing.lat == null) { listing.lat = info.lat; listing.lng = info.lng; }
  if (area && !listing.area && !listing.areaManual) listing.area = area;
  if (listing.bedrooms == null && info.bedrooms != null) listing.bedrooms = info.bedrooms;
  if (listing.bathrooms == null && info.bathrooms != null) listing.bathrooms = info.bathrooms;
  if (listing.beds == null && info.beds != null) listing.beds = info.beds;
  if (listing.sleeps == null && info.guests != null) listing.sleeps = info.guests;
  if (listing.rating == null && info.rating != null) listing.rating = info.rating;
  if (listing.reviews == null && info.reviews != null) listing.reviews = info.reviews;
  await saveState(env, trip, state);
  return j({ ok: true, listing });
}

// The trip's listings plus the whole group's ledger. members/expenses
// inside trip state are pre-merge leftovers, kept in KV but not served.
async function handleState(req, env, url) {
  const { members, expenses, ...state } = await getState(env, tripOf(url.searchParams.get('trip')));
  return j({ ...state, ...splitView(await getSplit(env)) });
}

export const routes = {
  'GET /api/state': handleState,
  'POST /api/add': handleAdd,
  'POST /api/add-manual': handleAddManual,
  'POST /api/vote': handleVote,
  'POST /api/remove': handleRemove,
  'POST /api/enrich': handleEnrich,
  'POST /api/prices': handlePrices,
  ...zoneRoutes,
};
