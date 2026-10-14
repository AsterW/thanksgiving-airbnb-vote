// Google Maps links. We only read the link itself, never Google's pages:
// a place link carries the name (/maps/place/<name>/) and the pin
// (!3d<lat>!4d<lng>, or the map centre @lat,lng); a search link carries the
// name in ?query= or ?q=. Share links (maps.app.goo.gl/…) are expanded by
// following their redirects, without fetching the page they point to.
// Not a browser user agent: for a full browser UA, maps.app.goo.gl answers 200
// with a page that redirects in JavaScript; anything else gets a plain 302.
const UA = 'Mozilla/5.0 (compatible; thanksgiving-trip/1.0)';
const SHORT_HOST = /^(maps\.app\.goo\.gl|goo\.gl)$/i;
const GOOGLE_HOST = /^((www|maps)\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/i;

function parse(u) { try { return new URL(u); } catch (e) { return null; } }

export function isMapsLink(u) {
  const url = parse(u);
  if (!url || !/^https?:$/.test(url.protocol)) return false;
  if (SHORT_HOST.test(url.hostname)) return url.hostname !== 'goo.gl' || url.pathname.startsWith('/maps');
  return GOOGLE_HOST.test(url.hostname) && (url.hostname.startsWith('maps.') || url.pathname.startsWith('/maps'));
}

// Short link -> full maps URL, or null if it doesn't lead to one.
// Only goo.gl hosts are ever fetched.
export async function expandLink(u) {
  let cur = u;
  for (let hop = 0; hop < 5; hop++) {
    const url = parse(cur);
    if (!url) return null;
    if (url.hostname === 'consent.google.com' && url.searchParams.get('continue')) { cur = url.searchParams.get('continue'); continue; }
    if (!SHORT_HOST.test(url.hostname)) return isMapsLink(cur) ? cur : null;
    let r;
    try { r = await fetch(cur, { redirect: 'manual', headers: { 'User-Agent': UA } }); } catch (e) { return null; }
    const next = r.headers.get('location');
    if (!next) return null;
    cur = new URL(next, cur).href;
  }
  return null;
}

// Name and pin from a full maps URL; any part can be missing. Only links to one
// specific place count: a place page, or a ?q= link that carries a place id
// (what the Maps app's share links often expand to). A plain search such as
// /maps/search/pizza is not a restaurant, so it gives no name.
export function readLink(u) {
  const url = parse(u);
  if (!url) return { name: '', lat: null, lng: null };
  const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
  const onePlace = ['ftid', 'cid', 'query_place_id'].some(k => url.searchParams.has(k));
  let name = place ? place[1] : onePlace ? url.searchParams.get('q') || url.searchParams.get('query') || '' : '';
  try { name = decodeURIComponent(name.replace(/\+/g, ' ')); } catch (e) { name = name.replace(/\+/g, ' '); }
  name = name.trim();
  let lat = null, lng = null;
  const pin = u.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const coords = name.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/); // ?q=39.7,-105.0 is a pin, not a name
  if (pin) { lat = Number(pin[1]); lng = Number(pin[2]); } else if (coords) { lat = Number(coords[1]); lng = Number(coords[2]); }
  if (coords) name = '';
  if (lat != null && (Math.abs(lat) > 90 || Math.abs(lng) > 180)) lat = lng = null;
  return { name: name.slice(0, 80), lat, lng };
}
