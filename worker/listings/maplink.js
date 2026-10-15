// Parsing a map share link into a hotel candidate. People share
// hotels as Google Maps / Apple Maps links, not Airbnb rooms — there
// is nothing to scrape for rooms or prices, but the share link
// itself carries the two things the hunt needs: the place's name and
// its coordinates (for the map and the automatic area grouping).
// Short links (maps.app.goo.gl) resolve by following the redirect;
// the resolved place URL has both. The place page's og:image is a
// bonus photo when it can be read.
import { SCRAPE_UA } from './scrape.js';

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

// The place's name: Google puts it in the /place/<name>/ path segment;
// Apple Maps carries it in q= (when q= is not a coordinate pair).
export function nameFromMapUrl(u) {
  const s = String(u || '');
  const m = s.match(/\/place\/([^/]+)/);
  if (m) {
    try {
      const n = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
      if (n) return n;
    } catch (e) { /* malformed escape: fall through */ }
  }
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
export async function parseMapLink(url) {
  let finalUrl = String(url || '').trim();
  let html = '';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(finalUrl, { signal: ctrl.signal, redirect: 'follow', headers: {
        'User-Agent': SCRAPE_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
      finalUrl = r.url || finalUrl;
      if (r.ok) html = await r.text();
    } finally { clearTimeout(t); }
  } catch (e) { /* unreachable: the long link itself may still parse below */ }
  const coords = coordsFromMapUrl(finalUrl) || coordsFromMapUrl(url);
  let title = nameFromMapUrl(finalUrl) || nameFromMapUrl(url);
  if (html) title = titleFromHtml(html, title) || title;
  const image = html ? (getMeta(html, 'og:image') || '') : '';
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
