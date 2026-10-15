// Google Maps / Apple Maps links -> one place: its name, street address,
// coordinates and Google place id. Shared by the restaurant list (worker/food)
// and the hunt's hotels (worker/listings/hotels.js).
//
// What a link carries depends on how it was made:
//   - a place page from the browser: /maps/place/<name>/@<view>/data=...!3d<lat>!4d<lng>
//     (the !3d/!4d pin is the place; @ is only where the map was looking);
//   - a share link from the Maps app (maps.app.goo.gl/...): it expands to
//     /maps/place/<name>, <street address>/data=...!1s<place id> with no
//     coordinates at all, or to ?q=<name>, <address>&ftid=<place id>;
//   - Apple Maps: ?ll=<lat>,<lng>&q=<name>[&address=...].
// So: the name is cut off where the street address starts, coordinates come
// from the pin (or a close-up @ view), and when the link has none, the street
// address is looked up on OpenStreetMap. A link that has a pin but no address
// gets its address the other way round, for showing on the card.
// Google's own place pages are no help for coordinates: what they serve to a
// server is a map of wherever the request came from.

const SHORT_HOST = /^(maps\.app\.goo\.gl|goo\.gl)$/i;
const GOOGLE_HOST = /^((www|maps)\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/i;
// Short links: a plain client gets a 302 to the place; some links only
// resolve for a phone (a desktop browser gets a page that redirects in
// JavaScript), so a phone is tried second.
const PLAIN_UA = 'Mozilla/5.0 (compatible; thanksgiving-trip/1.0)';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
// Nominatim's usage policy: identify the app, at most one request a second (adds are rare).
const GEO_UA = 'thanksgiving-airbnb-vote/1.0 (https://github.com/KenSu223/thanksgiving-airbnb-vote)';

const parse = u => { try { return new URL(String(u || '').trim()); } catch (e) { return null; } };
const inRange = (lat, lng) => isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
const decode = s => { try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return String(s).replace(/\+/g, ' '); } };

export function isMapLink(u) {
  const url = parse(u);
  if (!url || !/^https?:$/.test(url.protocol)) return false;
  const h = url.hostname.toLowerCase();
  if (SHORT_HOST.test(h)) return h !== 'goo.gl' || url.pathname.startsWith('/maps');
  if (h === 'maps.apple.com') return true;
  return GOOGLE_HOST.test(h) && (h.startsWith('maps.') || url.pathname.startsWith('/maps'));
}

// "Snooze, an A.M. Eatery, 2262 Larimer St, Denver, CO 80205" ->
// name "Snooze, an A.M. Eatery", address "2262 Larimer St, Denver, CO 80205":
// the address starts at the first comma followed by a house number.
export function splitNameAddress(s) {
  const t = String(s || '').trim();
  const cut = t.search(/,\s*(?=\d)/);
  if (cut <= 0) return { name: t, address: '' };
  return { name: t.slice(0, cut).trim(), address: t.slice(cut + 1).trim() };
}

// Everything the URL itself says. Any part can be missing.
export function readMapUrl(u) {
  const out = { name: '', address: '', lat: null, lng: null, placeId: '' };
  const s = String(u || '');
  const url = parse(s);
  if (!url) return out;
  const q = url.searchParams;
  if (url.hostname.toLowerCase() === 'maps.apple.com') {
    const name = (q.get('q') || q.get('name') || '').trim();
    if (name && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(name)) out.name = name;
    out.address = (q.get('address') || '').trim();
  } else {
    const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
    // ?q= names one place only with a place id beside it; a plain search (/maps/search/pizza) isn't a place
    const onePlace = ['ftid', 'cid', 'query_place_id'].some(k => q.has(k));
    const text = place ? decode(place[1]) : onePlace ? (q.get('q') || q.get('query') || '') : '';
    if (text && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text.trim())) Object.assign(out, splitNameAddress(text));
  }
  // coordinates, most exact first
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m && inRange(+m[1], +m[2])) { out.lat = +m[1]; out.lng = +m[2]; }
  if (out.lat == null) {
    // @lat,lng,17z is where the map looked; only a close-up view sits on the place
    m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,(\d+(?:\.\d+)?)([zm]))?/);
    if (m && inRange(+m[1], +m[2]) && (!m[3] || m[4] === 'm' || +m[3] >= 15)) { out.lat = +m[1]; out.lng = +m[2]; }
  }
  if (out.lat == null) {
    for (const k of ['ll', 'coordinate', 'center', 'sll', 'q', 'query', 'destination']) {
      const c = (q.get(k) || '').trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
      if (c && inRange(+c[1], +c[2])) { out.lat = +c[1]; out.lng = +c[2]; break; }
    }
  }
  m = s.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i) || [null, q.get('ftid') || ''];
  out.placeId = /^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(m[1] || '') ? m[1].toLowerCase() : '';
  out.name = out.name.slice(0, 120);
  out.address = out.address.slice(0, 200);
  return out;
}

// A share link -> the full maps URL it stands for (null if it leads nowhere
// useful). Only Google's own short-link hosts are ever fetched.
async function hops(u, ua) {
  let cur = u;
  for (let i = 0; i < 6; i++) {
    const url = parse(cur);
    if (!url) return null;
    if (url.hostname === 'consent.google.com' && url.searchParams.get('continue')) { cur = url.searchParams.get('continue'); continue; }
    if (!SHORT_HOST.test(url.hostname)) return isMapLink(cur) ? cur : null;
    let r;
    try { r = await fetch(cur, { redirect: 'manual', headers: { 'User-Agent': ua } }); } catch (e) { return null; }
    const next = r.headers.get('location');
    if (!next) return null;
    cur = new URL(next, cur).href;
  }
  return null;
}
export async function expandLink(u) {
  const url = parse(u);
  if (!url || !SHORT_HOST.test(url.hostname)) return isMapLink(u) ? String(u).trim() : null;
  const plain = await hops(u, PLAIN_UA);
  const info = plain && readMapUrl(plain);
  if (info && (info.name || info.lat != null)) return plain;
  return (await hops(u, PHONE_UA)) || plain;
}

async function nominatim(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/' + path, { signal: ctrl.signal, headers: { 'User-Agent': GEO_UA, 'Accept-Language': 'en' } });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}
// Street address (or a place's name) -> coordinates; box = [west, north, east, south] keeps the search inside it.
export async function geocode(text, box) {
  const j = await nominatim('search?format=jsonv2&limit=1&q=' + encodeURIComponent(text) + (box ? '&bounded=1&viewbox=' + box.join(',') : ''));
  const hit = Array.isArray(j) && j[0];
  return hit && inRange(+hit.lat, +hit.lon) ? { lat: +hit.lat, lng: +hit.lon } : null;
}
// The box around a trip's areas ({ lat, lng, km } each), for looking a name up near them.
const boxAround = zones => {
  if (!zones || !zones.length) return null;
  const dLat = z => z.km / 111, dLng = z => z.km / (111 * Math.cos(z.lat * Math.PI / 180));
  return [Math.min(...zones.map(z => z.lng - dLng(z))), Math.max(...zones.map(z => z.lat + dLat(z))),
    Math.max(...zones.map(z => z.lng + dLng(z))), Math.min(...zones.map(z => z.lat - dLat(z)))].map(v => +v.toFixed(4));
};
// Coordinates -> "1550 Court Pl, Denver" (street and town; '' when unknown).
export async function streetAddress(lat, lng) {
  const j = await nominatim('reverse?format=jsonv2&zoom=18&lat=' + lat + '&lon=' + lng);
  const a = (j && j.address) || {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const town = a.city || a.town || a.village || a.hamlet || '';
  return [street, town].filter(Boolean).join(', ').slice(0, 200);
}

// The whole job: a link as pasted -> { ok, name, address, lat, lng, placeId, url }.
// url is the expanded maps URL (what gets stored and opened later). zones (the
// trip's areas) only matter for a link with neither a spot nor an address:
// then the name is looked up near them first, and anywhere after that.
export async function locatePlace(link, zones) {
  const url = await expandLink(link);
  if (!url) return { ok: false };
  const p = readMapUrl(url);
  if (p.lat == null && p.address) Object.assign(p, (await geocode(p.address)) || {});
  if (p.lat == null && !p.address && p.name) {
    const box = boxAround(zones);
    Object.assign(p, (box && await geocode(p.name, box)) || (await geocode(p.name)) || {});
  }
  if (p.lat != null && !p.address) p.address = await streetAddress(p.lat, p.lng);
  return { ok: !!p.name, ...p, url };
}
