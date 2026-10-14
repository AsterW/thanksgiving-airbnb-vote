// Restaurant routes: the trip's restaurant shortlist, adding from a copied
// Google Maps link, voting for the ones you want to go to, removing.
import { j, uid } from '../lib/http.js';
import { cleanName } from '../users/users.js';
import { expandLink, isMapsLink, readLink } from './maps.js';
import { placePhotos } from './photos.js';
import { getFood, updateFood } from './store.js';

const readBody = async req => { try { return await req.json(); } catch (e) { return {}; } };

async function handleList(req, env, url) {
  return j({ ok: true, places: (await getFood(env, url.searchParams.get('trip'))).places });
}

// Restaurants come only from a copied Google Maps link. If the link doesn't
// lead to a place we can name, the answer is "not found" — no searching.
async function handleAdd(req, env) {
  const body = await readBody(req);
  const link = String(body.url || '').trim().slice(0, 600);
  if (!link) return j({ ok: false, error: '贴个 Google 地图链接' });
  if (!isMapsLink(link)) return j({ ok: false, error: '这不是 Google 地图链接（要 google.com/maps/… 或 maps.app.goo.gl/… 这种）' });
  // Expand short links before touching KV, so a slow redirect can't clobber concurrent votes.
  const mapsUrl = await expandLink(link);
  const { name, lat, lng } = mapsUrl ? readLink(mapsUrl) : { name: '' };
  if (!name) return j({ ok: false, error: '找不到这家餐厅。在 Google 地图里打开店铺页，点“分享”复制链接再试' });
  const pre = await getFood(env, body.trip);
  const preExisting = pre.places.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (preExisting) return j({ ok: true, deduped: true, place: preExisting, places: pre.places });
  const images = await placePhotos(mapsUrl);
  // Fetching photos took a while: the insert happens in a transaction
  // against the freshest document, with the dedupe check re-run inside
  // (another request may have added the same place meanwhile).
  const place = {
    id: uid(), name, url: mapsUrl, lat, lng, images,
    note: String(body.note || '').trim().slice(0, 120), addedBy: cleanName(body.addedBy),
    createdAt: Date.now(), votes: [],
  };
  const out = await updateFood(env, body.trip, food => {
    const existing = food.places.find(p => p.name.toLowerCase() === name.toLowerCase());
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
  const out = await updateFood(env, trip, food => {
    const place = food.places.find(p => p.id === id);
    if (!place) return { error: '这家已经被删掉了' };
    place.votes = place.votes.filter(v => v.token !== token);
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
  'POST /api/food/remove': handleRemove,
};
