// Restaurant routes: the trip's restaurant shortlist, adding from a copied
// Google Maps link, voting for the ones you want to go to, removing.
import { j, uid } from '../lib/http.js';
import { cleanName, getUsers } from '../users/users.js';
import { dedupeVotes, isVoteBy } from '../lib/votes.js';
import { tripOf } from '../config/trips.js';
import { isMapLink, locatePlace } from '../lib/maplink.js';
import { placePhotos } from './photos.js';
import { getFood, updateFood } from './store.js';

const readBody = async req => { try { return await req.json() || {}; } catch (e) { return {}; } };

async function handleList(req, env, url) {
  const places = (await getFood(env, url.searchParams.get('trip'))).places;
  return j({ ok: true, places: places.map(p => ({ ...p, votes: dedupeVotes(p.votes) })) });
}

// Same place: Google's place id when both have one, else the name.
const samePlace = (a, b) => (a.placeId && b.placeId ? a.placeId === b.placeId : a.name.toLowerCase() === b.name.toLowerCase());

// Restaurants come only from a copied Google Maps link. If the link doesn't
// lead to a place we can name, the answer is "not found" — no searching.
// The link gives the name, street address and spot (worker/lib/maplink.js:
// a share link from the Maps app has no coordinates, so its address is looked up).
async function handleAdd(req, env) {
  const body = await readBody(req);
  const link = String(body.url || '').trim().slice(0, 600);
  if (!link) return j({ ok: false, error: '贴个 Google 地图链接' });
  if (!isMapLink(link)) return j({ ok: false, error: '这不是 Google 地图链接（要 google.com/maps/… 或 maps.app.goo.gl/… 这种）' });
  // Expand and look up before touching the list, so slow requests can't clobber concurrent votes.
  const p = await locatePlace(link, tripOf(body.trip).zones);
  if (!p.ok) return j({ ok: false, error: '找不到这家餐厅。在 Google 地图里打开店铺页，点“分享”复制链接再试' });
  const pre = await getFood(env, body.trip);
  const preExisting = pre.places.find(x => samePlace(x, p));
  if (preExisting) return j({ ok: true, deduped: true, place: preExisting, places: pre.places });
  const images = await placePhotos(p.url);
  // Fetching photos took a while: the insert happens in a transaction
  // against the freshest document, with the dedupe check re-run inside
  // (another request may have added the same place meanwhile).
  const place = {
    id: uid(), name: p.name, url: p.url, address: p.address, lat: p.lat, lng: p.lng, ...(p.placeId ? { placeId: p.placeId } : {}),
    images, located: 1,
    note: String(body.note || '').trim().slice(0, 120), addedBy: cleanName(body.addedBy),
    createdAt: Date.now(), votes: [],
  };
  const out = await updateFood(env, body.trip, food => {
    const existing = food.places.find(x => samePlace(x, place));
    if (existing) return { deduped: true, place: existing, places: food.places };
    food.places.unshift(place);
    return { place, places: food.places };
  });
  if (out.deduped) return j({ ok: true, deduped: true, place: out.place, places: out.places });
  return j({ ok: true, place: out.place, places: out.places });
}

// Same toggle as listings: with a name it's a vote, without one it's taking it back.
async function handleVote(req, env) {
  const { trip, id, token, name } = await readBody(req);
  if (!id || !token) return j({ ok: false, error: '缺少参数' });
  const me = (await getUsers(env).catch(() => [])).find(u => u.token === token);
  const voterName = name || (me && me.name) || null;
  const out = await updateFood(env, trip, food => {
    const place = food.places.find(p => p.id === id);
    if (!place) return { error: '这家已经被删掉了' };
    place.votes = dedupeVotes((place.votes || []).filter(v => !isVoteBy(v, token, voterName)));
    if (name) place.votes.push({ token: String(token).slice(0, 80), name: cleanName(name), at: Date.now() });
    return { votes: place.votes };
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, votes: out.votes });
}

// Photos for a place added before photos existed (no `images` field yet).
// Tried once: a failure stores [] so the page doesn't keep asking.
async function handlePhotos(req, env) {
  const { trip, id } = await readBody(req);
  const peek = (await getFood(env, trip)).places.find(p => p.id === id);
  if (!peek) return j({ ok: false, error: '这家已经被删掉了' });
  if (Array.isArray(peek.images)) return j({ ok: true, images: peek.images });
  const images = await placePhotos(peek.url);
  // Apply onto the freshest document (the fetch above was slow).
  const out = await updateFood(env, trip, food => {
    const place = food.places.find(p => p.id === id);
    if (!place) return { error: '这家已经被删掉了' };
    place.images = images;
    return {};
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, images });
}

// Places added before addresses (no `located` yet): read their link again
// with today's reading, once. The old one kept "Name, 123 Street, Town" as
// the name of a place shared from the Maps app and had no spot for it (so it
// was missing from the map), and could take a zoomed-out map view for the
// place. This splits off the address, keeps it, and takes the pin — or the
// address looked up — as the spot.
async function handleLocate(req, env) {
  const { trip, id } = await readBody(req);
  const peek = (await getFood(env, trip)).places.find(p => p.id === id);
  if (!peek) return j({ ok: false, error: '这家已经被删掉了' });
  if (peek.located) return j({ ok: true, place: peek });
  const p = await locatePlace(peek.url, tripOf(trip).zones);
  // Apply onto the freshest document (the lookups above were slow).
  const out = await updateFood(env, trip, food => {
    const place = food.places.find(x => x.id === id);
    if (!place) return { error: '这家已经被删掉了' };
    if (p.ok) {
      if (place.name !== p.name && place.name.toLowerCase().startsWith(p.name.toLowerCase())) place.name = p.name;
      if (p.address) place.address = p.address;
      if (p.lat != null) { place.lat = p.lat; place.lng = p.lng; }
      if (p.placeId) place.placeId = p.placeId;
    }
    // done for good, unless it was a share link that couldn't be reached right now
    if (p.ok || !/goo\.gl\//.test(place.url)) place.located = 1;
    return { place };
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, place: out.place });
}

async function handleRemove(req, env) {
  const { trip, id } = await readBody(req);
  const out = await updateFood(env, trip, food => {
    const i = food.places.findIndex(p => p.id === id);
    if (i < 0) return { error: '这家已经被删掉了' };
    food.places.splice(i, 1);
    return { places: food.places };
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, places: out.places });
}

export const routes = {
  'GET /api/food': handleList,
  'POST /api/food/add': handleAdd,
  'POST /api/food/vote': handleVote,
  'POST /api/food/photos': handlePhotos,
  'POST /api/food/locate': handleLocate,
  'POST /api/food/remove': handleRemove,
};
