// Hotels sourced from Booking.com. Booking walls off server-side
// scraping (its pages answer non-browser clients with a challenge), so
// hotel data is pulled elsewhere — a real browser session — and posted
// here in structured form. Posting the same hotel again refreshes it:
// that is the pull-price path, the price and its pull time are replaced
// while the card, its votes and its position stay.
import { j, uid } from '../lib/http.js';
import { tripOf } from '../config/trips.js';
import { getState, updateState } from './state.js';
import { pickArea } from './zones.js';
import { closedError, votingOpen } from './decision.js';
import { cleanName } from '../users/users.js';

// booking.com/hotel/<cc>/<slug>.html → slug ('hyatt-place-denver-downtown')
export function bookingSlug(url) {
  const m = String(url || '').match(/booking\.com\/hotel\/[a-z]{2}\/([a-z0-9-]+?)(?:\.html)?(?:[/?#]|$)/i);
  return m ? m[1].toLowerCase() : null;
}

const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
const str = (v, n) => String(v || '').trim().slice(0, n);

async function handleAddHotel(req, env) {
  let body = {};
  try { body = await req.json() || {}; } catch (e) { /* ignore */ }
  const url = str(body.url, 500);
  const slug = bookingSlug(url);
  if (!slug) return j({ ok: false, error: '看起来不是 Booking.com 酒店链接（需要形如 booking.com/hotel/us/… 的链接）' });
  const title = str(body.title, 120);
  if (!title) return j({ ok: false, error: '酒店名是必填的' });
  const trip = tripOf(body.trip);
  if (!votingOpen(trip)) return closedError();
  const roomId = 'bk:' + slug;
  const lat = num(body.lat), lng = num(body.lng);
  const fields = {
    title, url,
    image: str(body.image, 500),
    rating: num(body.rating), reviews: num(body.reviews),
    priceUSD: num(body.priceUSD), priceNights: num(body.priceNights),
    note: str(body.note, 300),
  };
  if (fields.priceUSD) fields.priceAt = Date.now();
  // Zone the hotel the same way Airbnb listings are zoned, when located.
  let area = '';
  if (lat != null && lng != null) {
    const pre = await getState(env, trip);
    area = (await pickArea(trip, pre.listings, { lat, lng })).area || '';
  }
  const out = await updateState(env, trip, state => {
    const existing = state.listings.find(l => l.roomId === roomId);
    if (existing) {
      // A re-pull: refresh the data, keep the id, votes and who added it.
      for (const k of ['title', 'url', 'note']) if (fields[k]) existing[k] = fields[k];
      for (const k of ['image', 'rating', 'reviews', 'priceUSD', 'priceNights', 'priceAt']) {
        if (fields[k] != null && fields[k] !== '') existing[k] = fields[k];
      }
      if (lat != null && lng != null) { existing.lat = lat; existing.lng = lng; }
      if (area && !existing.area) existing.area = area;
      return { listing: existing, updated: true };
    }
    const listing = {
      id: uid(), roomId, kind: 'hotel', ...fields,
      ...(lat != null && lng != null ? { lat, lng } : {}),
      area, images: fields.image ? [fields.image] : [],
      sleeps: null, bedrooms: null, beds: null, bathrooms: null,
      addedBy: cleanName(body.addedBy), createdAt: Date.now(), votes: [],
    };
    state.listings.unshift(listing);
    return { listing };
  });
  return j({ ok: true, listing: out.listing, ...(out.updated ? { updated: true } : {}) });
}

export const routes = { 'POST /api/add-hotel': handleAddHotel };
