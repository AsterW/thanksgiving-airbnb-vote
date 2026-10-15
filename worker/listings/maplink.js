// Parsing a map share link into a hotel candidate. People share
// hotels as Google Maps / Apple Maps links, not Airbnb rooms — there
// is nothing to scrape for rooms or prices, but between the link,
// the page it resolves to, and a geocode of the address it names,
// everything the hunt needs can be recovered: the place's name and
// its coordinates (for the map and the automatic area grouping).
import { SCRAPE_UA } from './scrape.js';

// Short links only resolve for a phone: with a desktop UA,
// maps.app.goo.gl answers a generic landing page with no target in
// it at all (verified live); a mobile UA gets the real 302 to the
// place URL. The place page itself reads fine with either.
const MAP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

export function isMapLink(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch (e) { return false; }
  const h = u.hostname.toLowerCase();
  if (h === 'maps.app.goo.gl') return true;
  if (h === 'goo.gl') return u.pathname.startsWith('/maps');
  if (h === 'maps.apple.com') return true;
  if (/^(www\.)?google\.[a-z.]+$/.test(h) || h === 'maps.google.com' || h === 'maps.googleapis.com') {
    return u.pathname.includes('/maps');
  }
  return false;
}

const inRange = (lat, lng) => isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);

// Coordinates from a (resolved) map URL, most exact first: the place
// pin in the data blob (!3d/!4d), then the @lat,lng viewport centre
// (for a place link that is the place), then Apple Maps' ll=, then a
// bare "lat,lng" in q=/query=.
export function coordsFromMapUrl(u) {
  const s = String(u || '');
  let m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m && inRange(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
  m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m && inRange(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
  try {
    const q = new URL(s).searchParams;
    for (const k of ['ll', 'coordinate', 'center', 'sll']) {
      const v = q.get(k);
      if (!v) continue;
      const p = v.split(',').map(Number);
      if (p.length === 2 && inRange(p[0], p[1])) return { lat: p[0], lng: p[1] };
    }
    for (const k of ['q', 'query', 'destination']) {
      const v = (q.get(k) || '').trim();
      const c = v.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
      if (c && inRange(+c[1], +c[2])) return { lat: +c[1], lng: +c[2] };
    }
  } catch (e) { /* not a URL: no params to read */ }
  return null;
}

// The raw /place/ segment, decoded: name and often the full street
// address ("Sheraton Denver Downtown Hotel, 1550 Court Pl, Denver,
// CO 80202"). Also the best geocoding input when no coordinates
// came with the link.
export function placeSegment(u) {
  const m = String(u || '').match(/\/place\/([^/]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); } catch (e) { return ''; }
}

// The place's name: the segment above, cut where the digit-led
// street address starts. Apple Maps carries the name in q= (when
// q= is not a coordinate pair).
export function nameFromMapUrl(u) {
  const seg = placeSegment(u);
  if (seg) {
    const cut = seg.search(/,\s*(?=\d)/);
    const n = (cut > 0 ? seg.slice(0, cut) : seg).trim();
    if (n) return n;
  }
  const s = String(u || '');
  try {
    const q = new URL(s).searchParams;
    for (const k of ['q', 'name', 'query']) {
      const v = (q.get(k) || '').trim();
      if (v && !/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(v)) return v;
    }
  } catch (e) { /* ignore */ }
  return '';
}

// The cheapest nightly rate the place page itself advertises.
// Google Maps shows a hotel's offers from several booking sites in
// its page data; the strings live in the bootstrap payload, often
// unicode-escaped. Deliberately conservative: only prices tied to a
// known provider name or an explicit per-night label count, in a
// plausible band, and the LOWEST of those wins — nearby "similar
// hotels" carousels use different wording and stay out. Returns
// { nightly, provider } or null when the page shows no offers.
const PROVIDERS = ['Booking.com', 'Expedia', 'Hotels.com', 'Priceline', 'Agoda', 'Trip.com', 'Travelocity', 'Orbitz', 'Hotwire', '官方网站', 'Official site'];
export function extractCheapestRate(html) {
  if (!html) return null;
  const s = String(html).replace(/\\u0024/g, '$').replace(/\\u0022/g, '"').replace(/&dollar;/g, '$');
  const found = [];
  const money = v => Number(String(v).replace(/,/g, ''));
  const sane = n => isFinite(n) && n >= 25 && n <= 3000;
  for (const p of PROVIDERS) {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const m of s.matchAll(new RegExp(esc + '[^$]{0,160}\\$\\s?([\\d,]+)', 'g'))) if (sane(money(m[1]))) found.push({ nightly: money(m[1]), provider: p });
    for (const m of s.matchAll(new RegExp('\\$\\s?([\\d,]+)[^$]{0,160}' + esc, 'g'))) if (sane(money(m[1]))) found.push({ nightly: money(m[1]), provider: p });
  }
  for (const m of s.matchAll(/\$\s?([\d,]+)\s*(?:per night|\/night|nightly|每晚)/gi)) if (sane(money(m[1]))) found.push({ nightly: money(m[1]), provider: '' });
  if (!found.length) return null;
  found.sort((a, b) => a.nightly - b.nightly);
  return found[0];
}

function getMeta(html, prop) {
  const m = html.match(new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]*content=["\']([^"\']+)["\']', 'i'))
       || html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']' + prop + '["\']', 'i'));
  return m ? m[1] : '';
}

function titleFromHtml(html, name) {
  const og = getMeta(html, 'og:title').split(/[·|]/)[0].trim();
  if (og && !/^(google maps|apple maps)$/i.test(og)) return og;
  const t = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const cleaned = t.replace(/\s*[-·|]\s*(Google Maps|Apple Maps)\s*$/i, '').trim();
  return cleaned && !/^(google maps|apple maps)$/i.test(cleaned) ? cleaned : name;
}

// Resolve the link and read what it offers. Name + coordinates come
// from the URL whenever possible; the page fetch only adds a photo
// and a fallback title, so a blocked fetch still yields the hotel.
// Forward-geocode an address string via OpenStreetMap (the same
// service zones.js reverse-geocodes with; keyless, and adds are
// rare, so the volume is trivial). Resolved place URLs from short
// links carry only a place id — the payload Google serves has no
// plaintext coordinates — but the segment IS a postal address,
// which geocodes precisely.
async function geocodeAddress(text) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(text),
        { signal: ctrl.signal, headers: { 'User-Agent': SCRAPE_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
      if (!r.ok) return null;
      const j = await r.json();
      const hit = Array.isArray(j) && j[0];
      if (!hit) return null;
      const lat = Number(hit.lat), lng = Number(hit.lon);
      return inRange(lat, lng) ? { lat, lng } : null;
    } finally { clearTimeout(t); }
  } catch (e) { return null; }
}

export async function parseMapLink(url) {
  let finalUrl = String(url || '').trim();
  let html = '';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(finalUrl, { signal: ctrl.signal, redirect: 'follow', headers: {
        'User-Agent': MAP_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
      finalUrl = r.url || finalUrl;
      if (r.ok) html = await r.text();
    } finally { clearTimeout(t); }
  } catch (e) { /* unreachable: the long link itself may still parse below */ }
  let coords = coordsFromMapUrl(finalUrl) || coordsFromMapUrl(url);
  let title = nameFromMapUrl(finalUrl) || nameFromMapUrl(url);
  if (html) title = titleFromHtml(html, title) || title;
  let image = html ? (getMeta(html, 'og:image') || '') : '';
  if (/maps_512dp|branding|gstatic\.com\/.*logo/i.test(image)) image = ''; // the generic Maps icon is not a photo
  // A resolved place URL can carry no coordinates at all (just a
  // place id) — but the page's og:image is sometimes a static map
  // centred on the place, and its centre IS the place's location.
  if (!coords && image) {
    const c = image.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || image.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (c && inRange(+c[1], +c[2])) coords = { lat: +c[1], lng: +c[2] };
  }
  // Still nothing (the common short-link outcome): the place
  // segment is a full postal address — geocode it.
  if (!coords) {
    const seg = placeSegment(finalUrl) || placeSegment(url);
    const query = seg && /[\d,]/.test(seg) ? seg : (title && /[\d,]/.test(title) ? title : '');
    if (query) coords = await geocodeAddress(query);
  }
  const rate = html ? extractCheapestRate(html) : null;
  if (!title && !coords) return { ok: false };
  return { ok: true, title: String(title || '').slice(0, 120), image, rate,
    lat: coords ? coords.lat : null, lng: coords ? coords.lng : null, url: finalUrl };
}

// A hotel's identity for dedupe: the place itself (name + rounded
// coordinates), so the same hotel shared through different links —
// a short link today, the long one tomorrow — lands on one card.
export function hotelRoomId(info) {
  const raw = (info.title || '').toLowerCase() + '|' +
    (info.lat != null && info.lng != null ? info.lat.toFixed(4) + ',' + info.lng.toFixed(4) : (info.url || ''));
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0;
  return 'map:' + h.toString(36);
}
