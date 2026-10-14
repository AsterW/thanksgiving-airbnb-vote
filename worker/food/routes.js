// Restaurant routes: the trip's restaurant shortlist, adding from a copied
// Google Maps link, voting for the ones you want to go to, removing.
import { j, uid } from '../lib/http.js';
import { cleanName } from '../users/users.js';
import { expandLink, isMapsLink, readLink } from './maps.js';
import { getFood, saveFood } from './store.js';

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
  const food = await getFood(env, body.trip);
  const existing = food.places.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return j({ ok: true, deduped: true, place: existing, places: food.places });
  const place = {
    id: uid(), name, url: mapsUrl, lat, lng,
    note: String(body.note || '').trim().slice(0, 120), addedBy: cleanName(body.addedBy),
    createdAt: Date.now(), votes: [],
  };
  food.places.unshift(place);
  await saveFood(env, body.trip, food);
  return j({ ok: true, place, places: food.places });
}

// Same toggle as listings: with a name it's a vote, without one it's taking it back.
async function handleVote(req, env) {
  const { trip, id, token, name } = await readBody(req);
  if (!id || !token) return j({ ok: false, error: '缺少参数' });
  const food = await getFood(env, trip);
  const place = food.places.find(p => p.id === id);
  if (!place) return j({ ok: false, error: '这家已经被删掉了' });
  place.votes = place.votes.filter(v => v.token !== token);
  if (name) place.votes.push({ token: String(token).slice(0, 80), name: cleanName(name), at: Date.now() });
  await saveFood(env, trip, food);
  return j({ ok: true, votes: place.votes });
}

async function handleRemove(req, env) {
  const { trip, id } = await readBody(req);
  const food = await getFood(env, trip);
  const i = food.places.findIndex(p => p.id === id);
  if (i < 0) return j({ ok: false, error: '这家已经被删掉了' });
  food.places.splice(i, 1);
  await saveFood(env, trip, food);
  return j({ ok: true, places: food.places });
}

export const routes = {
  'GET /api/food': handleList,
  'POST /api/food/add': handleAdd,
  'POST /api/food/vote': handleVote,
  'POST /api/food/remove': handleRemove,
};
